import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"
import { DEFAULT_TIMEZONE, publicApi, stationsApi } from "./api/endpoints"
import type { Bucket, DeviceStatus, PageResponse, PeriodParams, PrecipitationSeries, Reading } from "./api/types"
import { buildSeriesTable, chunkRange, MAX_DAYS, type DateRange } from "./period"

/**
 * Exportação de dados de estações em CSV e XLSX, gerada no navegador a partir
 * dos endpoints existentes (série agregada, leituras brutas e status).
 * Leituras/status são paginados (máx. 100 por página) e limitados a 93 dias
 * por requisição — por isso o período é fatiado e as páginas buscadas em paralelo.
 */

export type ExportDataset = "series" | "readings" | "status"
export type ExportFormat = "csv" | "xlsx"
export type CsvDialect = "br" | "intl"

export const DATASET_LABEL: Record<ExportDataset, string> = {
  series: "Série de chuva agregada",
  readings: "Leituras brutas",
  status: "Status do dispositivo",
}

/** Teto de linhas por estação para leituras/status — evita travar o navegador. */
export const MAX_RAW_ROWS = 200_000

type CellType = "string" | "number" | "integer" | "datetime"
export interface Column {
  header: string
  type: CellType
}
export type Cell = string | number | Date | null
export interface Sheet {
  name: string
  columns: Column[]
  rows: Cell[][]
}

export interface ExportStation {
  id: string
  name: string
  hardwareId?: string
  sendIntervalS?: number | null
}

export interface ExportRequest {
  stations: ExportStation[]
  dataset: ExportDataset
  bucket: Bucket
  range: DateRange
  format: ExportFormat
  dialect: CsvDialect
  /** Área pública: só a série agregada, pelos endpoints /api/public. */
  publicMode?: boolean
  timezone?: string
}

export interface Progress {
  done: number
  total: number
  label: string
}

// ------------------------------------------------------------------ coleta

async function pool<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const out: T[] = new Array(tasks.length)
  let i = 0
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (i < tasks.length) {
      const idx = i++
      out[idx] = await tasks[idx]!()
    }
  })
  await Promise.all(workers)
  return out
}

type PagedFetcher<T> = (p: PeriodParams & { page: number; size: number }, signal: AbortSignal) => Promise<PageResponse<T>>

async function fetchAllPages<T>(
  fetcher: PagedFetcher<T>,
  range: DateRange,
  signal: AbortSignal,
  onPage: () => void,
  onTotal: (pages: number) => void,
): Promise<T[]> {
  const chunks = chunkRange(range, MAX_DAYS.RAW)
  const all: T[] = []
  for (const c of chunks) {
    const period = { from: c.from.toISOString(), to: c.to.toISOString() }
    const first = await fetcher({ ...period, page: 0, size: 100 }, signal)
    onTotal(first.totalPages)
    onPage()
    all.push(...first.content)
    if (all.length + first.totalElements - first.content.length > MAX_RAW_ROWS) {
      throw new Error(
        `O período tem mais de ${MAX_RAW_ROWS.toLocaleString("pt-BR")} registros. Reduza o período ou use a série agregada.`,
      )
    }
    const rest = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, k) => async () => {
      const r = await fetcher({ ...period, page: k + 1, size: 100 }, signal)
      onPage()
      return r.content
    })
    for (const part of await pool(rest, 4)) all.push(...part)
  }
  return all
}

async function fetchSeries(req: ExportRequest, st: ExportStation, signal: AbortSignal): Promise<PrecipitationSeries[]> {
  // HOUR/DAY: fatiamos em janelas alinhadas (dias inteiros). WEEK/MONTH cabem em uma requisição (validado no form).
  const chunks = req.bucket === "HOUR" || req.bucket === "DAY" ? chunkRange(req.range, MAX_DAYS[req.bucket]) : [req.range]
  const tz = req.timezone ?? DEFAULT_TIMEZONE
  const tasks = chunks.map((c) => () => {
    const p = { bucket: req.bucket, from: c.from.toISOString(), to: c.to.toISOString(), timezone: tz }
    return req.publicMode ? publicApi.precipitation(st.id, p, signal) : stationsApi.precipitation(st.id, p, signal)
  })
  return pool(tasks, 3)
}

// ------------------------------------------------------------------ linhas

function wall(iso: string | Date, tz: string): Date {
  // Excel não tem fuso: gravamos a "hora de parede" no fuso escolhido.
  const z = new TZDate(typeof iso === "string" ? new Date(iso) : iso, tz)
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), z.getHours(), z.getMinutes(), z.getSeconds()))
}

function seriesSheet(req: ExportRequest, st: ExportStation, parts: PrecipitationSeries[], tz: string): Sheet {
  const rows: Cell[][] = []
  for (const s of parts) {
    const t = buildSeriesTable(s, req.publicMode ? null : st.sendIntervalS)
    for (const r of t.rows) {
      const situacao =
        r.mm == null ? "SEM_DADOS" : r.coverage == null ? "COBERTURA_DESCONHECIDA" : r.coverage < 99.5 ? "PARCIAL" : "COMPLETO"
      rows.push([
        st.name,
        wall(r.start, tz),
        r.mm,
        r.readings,
        r.expected == null ? null : Math.round(r.expected),
        r.coverage == null ? null : Math.round(r.coverage * 10) / 10,
        situacao,
      ])
    }
  }
  return {
    name: st.name,
    columns: [
      { header: "estacao", type: "string" },
      { header: `inicio_bucket (${tz})`, type: "datetime" },
      { header: "chuva_mm", type: "number" },
      { header: "leituras_recebidas", type: "integer" },
      { header: "leituras_esperadas", type: "integer" },
      { header: "cobertura_pct", type: "number" },
      { header: "situacao", type: "string" },
    ],
    rows,
  }
}

function readingsSheet(st: ExportStation, readings: Reading[], tz: string): Sheet {
  const uniq = new Map(readings.map((r) => [`${r.measuredAt}|${r.seq}`, r]))
  const sorted = [...uniq.values()].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  let prevSeq: number | null = null
  const rows = sorted.map((r): Cell[] => {
    // Lacuna de sequência = pacotes perdidos (seq zera no reboot → não conta).
    const gap = prevSeq != null && r.seq > prevSeq ? r.seq - prevSeq - 1 : 0
    prevSeq = r.seq
    return [st.name, wall(r.measuredAt, tz), wall(r.receivedAt, tz), r.precipitationMm, r.tipsPerMinute, r.seq, gap]
  })
  return {
    name: st.name,
    columns: [
      { header: "estacao", type: "string" },
      { header: `medido_em (${tz})`, type: "datetime" },
      { header: `recebido_em (${tz})`, type: "datetime" },
      { header: "chuva_mm", type: "number" },
      { header: "basculadas_por_minuto", type: "integer" },
      { header: "seq", type: "integer" },
      { header: "pacotes_perdidos_antes", type: "integer" },
    ],
    rows,
  }
}

function statusSheet(st: ExportStation, items: DeviceStatus[], tz: string): Sheet {
  const sorted = [...items].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  return {
    name: st.name,
    columns: [
      { header: "estacao", type: "string" },
      { header: `medido_em (${tz})`, type: "datetime" },
      { header: "bateria_v", type: "number" },
      { header: "bateria_pct", type: "integer" },
      { header: "rssi_gateway_dbm", type: "integer" },
      { header: "rssi_estacao_dbm", type: "integer" },
      { header: "uptime_gateway_s", type: "integer" },
      { header: "uptime_estacao_s", type: "integer" },
    ],
    rows: sorted.map((s) => [
      st.name,
      wall(s.measuredAt, tz),
      s.batteryV ?? null,
      s.batteryPct ?? null,
      s.rssiGatewayDbm ?? null,
      s.rssiStationDbm ?? null,
      s.uptimeGatewayS ?? null,
      s.uptimeStationS ?? null,
    ]),
  }
}

export async function collectSheets(
  req: ExportRequest,
  signal: AbortSignal,
  onProgress: (p: Progress) => void,
): Promise<Sheet[]> {
  const tz = req.timezone ?? DEFAULT_TIMEZONE
  const sheets: Sheet[] = []
  let done = 0
  let total = req.stations.length
  const tick = (label: string) => onProgress({ done, total, label })
  for (const st of req.stations) {
    tick(`Buscando ${st.name}…`)
    if (req.dataset === "series") {
      sheets.push(seriesSheet(req, st, await fetchSeries(req, st, signal), tz))
      done++
    } else {
      const fetcher: PagedFetcher<Reading | DeviceStatus> =
        req.dataset === "readings"
          ? (p, s) => stationsApi.readings(st.id, p, s)
          : (p, s) => stationsApi.status(st.id, p, s)
      const items = await fetchAllPages(
        fetcher,
        req.range,
        signal,
        () => {
          done++
          tick(`Buscando ${st.name}…`)
        },
        (pages) => {
          total += pages
          tick(`Buscando ${st.name}…`)
        },
      )
      sheets.push(
        req.dataset === "readings"
          ? readingsSheet(st, items as Reading[], tz)
          : statusSheet(st, items as DeviceStatus[], tz),
      )
      done++
    }
    tick("Gerando arquivo…")
  }
  return sheets
}

// ------------------------------------------------------------------ arquivos

function csvCell(v: Cell, type: CellType, dialect: CsvDialect, delimiter: string): string {
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ")
  if (typeof v === "number") {
    const s = type === "integer" ? String(Math.round(v)) : String(v)
    return dialect === "br" ? s.replace(".", ",") : s
  }
  return /["\n\r]/.test(v) || v.includes(delimiter) ? `"${v.replace(/"/g, '""')}"` : v
}

export function buildCsv(sheets: Sheet[], dialect: CsvDialect): Blob {
  const delimiter = dialect === "br" ? ";" : ","
  const columns = sheets[0]?.columns ?? []
  const lines = [columns.map((c) => c.header).join(delimiter)]
  for (const sh of sheets)
    for (const row of sh.rows) lines.push(row.map((v, i) => csvCell(v, columns[i]!.type, dialect, delimiter)).join(delimiter))
  // BOM para o Excel reconhecer UTF-8.
  return new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" })
}

function sheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Estacao"
  let n = base
  let i = 2
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 26)} ${i++}`
  used.add(n.toLowerCase())
  return n
}

export async function buildXlsx(sheets: Sheet[], meta: [string, string][]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PluvIFFar"
  wb.created = new Date()
  const used = new Set<string>(["sobre"])
  for (const sh of sheets) {
    const ws = wb.addWorksheet(sheetName(sh.name, used), { views: [{ state: "frozen", ySplit: 1 }] })
    ws.columns = sh.columns.map((c) => ({
      header: c.header,
      width: Math.max(12, c.header.length + 2),
      style:
        c.type === "datetime"
          ? { numFmt: "dd/mm/yyyy hh:mm" }
          : c.type === "number"
            ? { numFmt: "0.00" }
            : c.type === "integer"
              ? { numFmt: "0" }
              : {},
    }))
    ws.getRow(1).font = { bold: true }
    ws.addRows(sh.rows)
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sh.columns.length } }
  }
  const about = wb.addWorksheet("Sobre")
  about.columns = [{ width: 28 }, { width: 80 }]
  meta.forEach((m) => about.addRow(m))
  about.getColumn(1).font = { bold: true }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

export function exportMeta(req: ExportRequest): [string, string][] {
  const tz = req.timezone ?? DEFAULT_TIMEZONE
  const f = (d: Date) => format(new TZDate(d, tz), "dd/MM/yyyy HH:mm")
  return [
    ["Gerado em", f(new Date())],
    ["Conjunto", DATASET_LABEL[req.dataset]],
    ...(req.dataset === "series" ? ([["Granularidade", req.bucket]] as [string, string][]) : []),
    ["Período", `${f(req.range.from)} até ${f(req.range.to)} (fim exclusivo)`],
    ["Fuso", tz],
    ["Estações", req.stations.map((s) => s.name).join(", ")],
    [
      "Aviso",
      "Buckets sem leitura aparecem com chuva vazia e situação SEM_DADOS: ausência de pacote NÃO significa chuva zero. Cobertura < 100% indica acumulado parcial.",
    ],
  ]
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function exportFilename(req: ExportRequest): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
  const who = req.stations.length === 1 ? slug(req.stations[0]!.name) : `${req.stations.length}-estacoes`
  const d = (x: Date) => format(new TZDate(x, req.timezone ?? DEFAULT_TIMEZONE), "yyyyMMdd")
  const kind = req.dataset === "series" ? `chuva-${req.bucket.toLowerCase()}` : req.dataset === "readings" ? "leituras" : "status"
  return `pluviffar-${who}-${kind}-${d(req.range.from)}-${d(new Date(req.range.to.getTime() - 1))}.${req.format}`
}

export async function runExport(req: ExportRequest, signal: AbortSignal, onProgress: (p: Progress) => void) {
  const sheets = await collectSheets(req, signal, onProgress)
  const blob = req.format === "csv" ? buildCsv(sheets, req.dialect) : await buildXlsx(sheets, exportMeta(req))
  downloadBlob(blob, exportFilename(req))
  return { rows: sheets.reduce((s, sh) => s + sh.rows.length, 0) }
}
