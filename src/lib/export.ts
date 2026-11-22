import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"
import { DEFAULT_TIMEZONE, publicApi, stationsApi } from "./api/endpoints"
import type { Bucket, PageResponse, PeriodParams, PrecipitationSeries, Reading } from "./api/types"
import { BUCKET_LABEL, buildSeriesTable, chunkRange, chunkRangeByBucket, MAX_DAYS, type DateRange } from "./period"

/**
 * Exportação de chuva em CSV e XLSX, gerada no navegador: agregados (série por
 * hora/dia/semana/mês, endpoint de precipitação) ou cada leitura recebida
 * (`raw`, endpoint de leituras — só logado). CSV sempre no padrão pt-BR
 * (separador ";" e vírgula decimal) e cabeçalhos legíveis.
 */

export type ExportFormat = "csv" | "xlsx"

type CellType = "string" | "number" | "integer" | "datetime" | "timestamp" | "date"
export interface Column {
  /** Nome técnico em pt-BR (snake_case, sem acento) — fácil de acessar em pandas/R/planilhas. */
  header: string
  type: CellType
  /** Descrição para o dicionário de colunas da aba "Sobre" do XLSX. */
  description?: string
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
  bucket: Bucket
  /** Cada leitura (pacote) em vez dos agregados; ignora `bucket`. Indisponível na área pública. */
  raw?: boolean
  range: DateRange
  format: ExportFormat
  /** Área pública: endpoints /api/public, sem colunas de cobertura. */
  publicMode?: boolean
  timezone?: string
}

export interface Progress {
  done: number
  total: number
  label: string
}

export const SITUATION_LABEL = {
  complete: "COMPLETO",
  partial: "PARCIAL",
  noData: "SEM_DADOS",
  unknown: "COBERTURA_DESCONHECIDA",
} as const

// ------------------------------------------------------------------ coleta

export async function pool<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
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

async function fetchSeries(req: ExportRequest, st: ExportStation, signal: AbortSignal): Promise<PrecipitationSeries[]> {
  // Sem limite de período no front: fatiamos pelos limites da API por requisição, com cortes em início de bucket.
  const tz = req.timezone ?? DEFAULT_TIMEZONE
  const chunks = chunkRangeByBucket(req.range, req.bucket, MAX_DAYS[req.bucket], tz)
  const tasks = chunks.map((c) => () => {
    const p = { bucket: req.bucket, from: c.from.toISOString(), to: c.to.toISOString(), timezone: tz }
    return req.publicMode ? publicApi.precipitation(st.id, p, signal) : stationsApi.precipitation(st.id, p, signal)
  })
  return pool(tasks, 3)
}

async function fetchReadings(st: ExportStation, range: DateRange, signal: AbortSignal, onPage: (pages: number) => void): Promise<Reading[]> {
  // /readings: máx. 93 dias e 100 itens por requisição → fatia o período e pagina em paralelo.
  const all: Reading[] = []
  const get = (p: PeriodParams, page: number): Promise<PageResponse<Reading>> =>
    stationsApi.readings(st.id, { ...p, page, size: 100 }, signal)
  for (const c of chunkRange(range, MAX_DAYS.RAW)) {
    const period = { from: c.from.toISOString(), to: c.to.toISOString() }
    const first = await get(period, 0)
    onPage(first.totalPages)
    all.push(...first.content)
    const rest = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, k) => async () => {
      const r = await get(period, k + 1)
      onPage(0)
      return r.content
    })
    for (const part of await pool(rest, 4)) all.push(...part)
  }
  return all
}

// ------------------------------------------------------------------ linhas

function wall(iso: string | Date, tz: string): Date {
  // Excel não tem fuso: gravamos a "hora de parede" no fuso escolhido.
  const z = new TZDate(typeof iso === "string" ? new Date(iso) : iso, tz)
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), z.getHours(), z.getMinutes(), z.getSeconds()))
}

function tzLabel(tz: string) {
  return tz === "America/Sao_Paulo" ? "horário de Brasília" : tz
}

const START_DESC: Record<Bucket, string> = { HOUR: "Início da hora", DAY: "Dia", WEEK: "Início da semana", MONTH: "Início do mês" }

export function seriesSheet(req: ExportRequest, st: ExportStation, parts: PrecipitationSeries[], tz: string): Sheet {
  // Mesmas colunas e valores em qualquer origem. Na área pública a API não expõe o intervalo de envio →
  // esperadas/cobertura ficam vazias e a situação dos buckets com dado é COBERTURA_DESCONHECIDA.
  const sendIntervalS = req.publicMode ? null : st.sendIntervalS
  const rows: Cell[][] = []
  for (const s of parts) {
    for (const r of buildSeriesTable(s, sendIntervalS).rows) {
      const situation =
        r.mm == null
          ? SITUATION_LABEL.noData
          : r.coverage == null
            ? SITUATION_LABEL.unknown
            : r.coverage < 99.5
              ? SITUATION_LABEL.partial
              : SITUATION_LABEL.complete
      rows.push([
        st.name,
        wall(r.start, tz),
        r.mm,
        r.readings,
        r.expected == null ? null : Math.round(r.expected),
        r.coverage == null ? null : Math.round(r.coverage * 10) / 10,
        situation,
      ])
    }
  }
  const startType: CellType = req.bucket === "HOUR" ? "datetime" : "date"
  return {
    name: st.name,
    columns: [
      { header: "estacao", type: "string", description: "Nome da estação" },
      { header: "inicio", type: startType, description: `${START_DESC[req.bucket]} (${tzLabel(tz)})` },
      { header: "chuva_mm", type: "number", description: "Chuva acumulada no período, em mm (vazio = sem dados, não é zero)" },
      { header: "leituras_recebidas", type: "integer", description: "Pacotes recebidos no período" },
      {
        header: "leituras_esperadas",
        type: "integer",
        description: "Pacotes esperados (duração ÷ intervalo de envio); vazio se o intervalo é desconhecido",
      },
      { header: "cobertura_pct", type: "number", description: "Recebidas ÷ esperadas, em % (máx. 100); vazio se não estimável" },
      { header: "situacao", type: "string", description: "COMPLETO, PARCIAL, SEM_DADOS ou COBERTURA_DESCONHECIDA" },
    ],
    rows,
  }
}

export function readingsSheet(st: ExportStation, readings: Reading[], tz: string): Sheet {
  const uniq = new Map(readings.map((r) => [`${r.measuredAt}|${r.seq}`, r]))
  const sorted = [...uniq.values()].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  let prevSeq: number | null = null
  const rows = sorted.map((r): Cell[] => {
    // Lacuna de sequência = pacotes perdidos (seq zera no reboot → não conta).
    const lost = prevSeq != null && r.seq > prevSeq ? r.seq - prevSeq - 1 : 0
    prevSeq = r.seq
    return [st.name, wall(r.measuredAt, tz), wall(r.receivedAt, tz), r.tipsPerMinute, r.precipitationMm, r.seq, lost]
  })
  return {
    name: st.name,
    columns: [
      { header: "estacao", type: "string", description: "Nome da estação" },
      { header: "medido_em", type: "timestamp", description: `Momento da medição (${tzLabel(tz)})` },
      { header: "recebido_em", type: "timestamp", description: `Momento em que o servidor recebeu o pacote (${tzLabel(tz)})` },
      { header: "basculadas", type: "integer", description: "Basculadas contadas no pacote" },
      { header: "chuva_mm", type: "number", description: "Chuva do pacote, em mm" },
      { header: "seq", type: "integer", description: "Número de sequência do pacote (reinicia quando o equipamento religa)" },
      { header: "pacotes_perdidos_antes", type: "integer", description: "Pacotes não recebidos antes deste (lacuna de seq)" },
    ],
    rows,
  }
}

export async function collectSheets(req: ExportRequest, signal: AbortSignal, onProgress: (p: Progress) => void): Promise<Sheet[]> {
  const tz = req.timezone ?? DEFAULT_TIMEZONE
  const sheets: Sheet[] = []
  // Agregados: 1 passo por estação. Leituras: 1 passo por página (o total cresce conforme as páginas são descobertas).
  let done = 0
  let total = req.stations.length
  for (const st of req.stations) {
    const label = `Buscando ${st.name}…`
    onProgress({ done, total, label })
    if (req.raw && !req.publicMode) {
      const items = await fetchReadings(st, req.range, signal, (pages) => {
        total += pages
        done += 1
        onProgress({ done, total, label })
      })
      sheets.push(readingsSheet(st, items, tz))
    } else {
      sheets.push(seriesSheet(req, st, await fetchSeries(req, st, signal), tz))
    }
    done++
  }
  onProgress({ done: total, total, label: "Gerando arquivo…" })
  return sheets
}

// ------------------------------------------------------------------ arquivos

const pad = (n: number) => String(n).padStart(2, "0")

function csvCell(v: Cell, type: CellType): string {
  if (v == null) return ""
  if (v instanceof Date) {
    // Datas já estão em "hora de parede" (UTC = hora local do fuso).
    const d = `${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`
    if (type === "date") return d
    const hm = `${d} ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`
    return type === "timestamp" ? `${hm}:${pad(v.getUTCSeconds())}` : hm
  }
  if (typeof v === "number") return (type === "integer" ? String(Math.round(v)) : String(v)).replace(".", ",")
  return /["\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** CSV no padrão do Excel pt-BR: separador ";", vírgula decimal, datas dd/mm/aaaa [HH:mm[:ss]], UTF-8 com BOM. */
export function buildCsv(sheets: Sheet[]): Blob {
  const columns = sheets[0]?.columns ?? []
  // BOM para o Excel reconhecer UTF-8. Uma parte por linha: evita montar uma string gigante em exportações longas.
  const parts = ["\ufeff" + columns.map((c) => csvCell(c.header, "string")).join(";") + "\r\n"]
  for (const sh of sheets) for (const row of sh.rows) parts.push(row.map((v, i) => csvCell(v, columns[i]!.type)).join(";") + "\r\n")
  return new Blob(parts, { type: "text/csv;charset=utf-8" })
}

function sheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Estacao"
  let n = base
  let i = 2
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 26)} ${i++}`
  used.add(n.toLowerCase())
  return n
}

/** Linhas de dados por aba (o Excel aceita 1.048.576, incluindo o cabeçalho). */
const XLSX_MAX_ROWS = 1_048_575

export async function buildXlsx(sheets: Sheet[], meta: [string, string][]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PluvIFFar"
  wb.created = new Date()
  const used = new Set<string>(["sobre"])
  // Limite do formato (1.048.576 linhas por aba): estações com mais linhas continuam em abas "Nome (2)", "Nome (3)"…
  const pages = sheets.flatMap((sh) => {
    const n = Math.max(1, Math.ceil(sh.rows.length / XLSX_MAX_ROWS))
    return Array.from({ length: n }, (_, k) => ({
      ...sh,
      name: n > 1 ? `${sh.name.slice(0, 24)} (${k + 1})` : sh.name,
      rows: sh.rows.slice(k * XLSX_MAX_ROWS, (k + 1) * XLSX_MAX_ROWS),
    }))
  })
  for (const sh of pages) {
    const ws = wb.addWorksheet(sheetName(sh.name, used), { views: [{ state: "frozen", ySplit: 1 }] })
    ws.columns = sh.columns.map((c) => ({
      header: c.header,
      width: Math.max(12, c.header.length + 2),
      style:
        c.type === "timestamp"
          ? { numFmt: "dd/mm/yyyy hh:mm:ss" }
          : c.type === "datetime"
            ? { numFmt: "dd/mm/yyyy hh:mm" }
            : c.type === "date"
              ? { numFmt: "dd/mm/yyyy" }
              : c.type === "number"
                ? { numFmt: "0.0#" }
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
  const dict = (sheets[0]?.columns ?? []).filter((c) => c.description)
  if (dict.length) {
    about.addRow([])
    about.addRow(["Coluna", "Descrição"])
    dict.forEach((c) => about.addRow([c.header, c.description]))
  }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

export function exportMeta(req: ExportRequest): [string, string][] {
  const tz = req.timezone ?? DEFAULT_TIMEZONE
  const f = (d: Date) => format(new TZDate(d, tz), "dd/MM/yyyy HH:mm")
  return [
    ["Gerado em", f(new Date())],
    ...((req.raw
      ? [["Dados", "Cada leitura recebida (sem agregação)"]]
      : [
          ["Dados", "Chuva acumulada (agregados)"],
          ["Agrupado por", BUCKET_LABEL[req.bucket]],
        ]) as [string, string][]),
    ["Período", `${f(req.range.from)} até ${f(req.range.to)} (fim exclusivo)`],
    ["Fuso horário", tzLabel(tz) === tz ? tz : `${tzLabel(tz)} (${tz})`],
    ["Estações", req.stations.map((s) => s.name).join(", ")],
    [
      "Aviso",
      req.raw
        ? 'Uma linha por pacote recebido. Intervalos sem linha são pacotes não recebidos — NÃO significam chuva zero. "Pacotes perdidos antes" vem das lacunas da sequência (a sequência reinicia quando o equipamento religa).'
        : `Períodos sem leitura aparecem com chuva vazia e situação "${SITUATION_LABEL.noData}": ausência de dado NÃO significa chuva zero. Cobertura abaixo de 100% indica acumulado parcial.${req.publicMode ? ` Área pública: o intervalo de envio não é divulgado, então a cobertura não é estimável (situação "${SITUATION_LABEL.unknown}").` : ""}`,
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

const BUCKET_SLUG: Record<Bucket, string> = { HOUR: "horaria", DAY: "diaria", WEEK: "semanal", MONTH: "mensal" }

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
  const kind = req.raw ? "leituras" : `chuva-${BUCKET_SLUG[req.bucket]}`
  return `pluviffar-${who}-${kind}-${d(req.range.from)}-${d(new Date(req.range.to.getTime() - 1))}.${req.format}`
}

export async function runExport(req: ExportRequest, signal: AbortSignal, onProgress: (p: Progress) => void) {
  const sheets = await collectSheets(req, signal, onProgress)
  const blob = req.format === "csv" ? buildCsv(sheets) : await buildXlsx(sheets, exportMeta(req))
  downloadBlob(blob, exportFilename(req))
  return { rows: sheets.reduce((s, sh) => s + sh.rows.length, 0) }
}
