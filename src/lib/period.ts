import { TZDate } from "@date-fns/tz"
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfHour,
  startOfISOWeek,
  startOfMonth,
  subDays,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { DEFAULT_TIMEZONE } from "./api/endpoints"
import type { Bucket, PrecipitationSeries } from "./api/types"

/** Período máximo aceito pela API por granularidade (dias). */
export const MAX_DAYS: Record<Bucket | "RAW", number> = { HOUR: 93, DAY: 1100, WEEK: 3660, MONTH: 10980, RAW: 93 }

export const BUCKET_LABEL: Record<Bucket, string> = { HOUR: "Hora", DAY: "Dia", WEEK: "Semana", MONTH: "Mês" }

export interface DateRange {
  from: Date
  to: Date
}

/** Dias de calendário (no fuso) → intervalo [início do 1º dia, início do dia seguinte ao último), limitado a agora. */
export function dayRange(fromDay: Date, toDay: Date, tz = DEFAULT_TIMEZONE): DateRange {
  const f = startOfDay(new TZDate(fromDay.getFullYear(), fromDay.getMonth(), fromDay.getDate(), tz))
  const t = addDays(startOfDay(new TZDate(toDay.getFullYear(), toDay.getMonth(), toDay.getDate(), tz)), 1)
  const now = new Date()
  return { from: new Date(f.getTime()), to: new Date(Math.min(t.getTime(), now.getTime())) }
}

/** Últimos N dias de calendário, incluindo hoje. */
export function lastDays(n: number): { fromDay: Date; toDay: Date } {
  const today = new Date()
  return { fromDay: subDays(today, n - 1), toDay: today }
}

export function rangeDays(r: DateRange): number {
  return Math.max(1, Math.ceil((r.to.getTime() - r.from.getTime()) / 86_400_000))
}

export function calendarDays(fromDay: Date, toDay: Date): number {
  return differenceInCalendarDays(toDay, fromDay) + 1
}

/** Granularidade sugerida para o tamanho do período. */
export function suggestBucket(days: number): Bucket {
  if (days <= 3) return "HOUR"
  if (days <= 120) return "DAY"
  if (days <= 730) return "WEEK"
  return "MONTH"
}

function align(d: Date, bucket: Bucket, tz: string): TZDate {
  const z = new TZDate(d, tz)
  switch (bucket) {
    case "HOUR":
      return startOfHour(z)
    case "DAY":
      return startOfDay(z)
    case "WEEK":
      return startOfISOWeek(z)
    case "MONTH":
      return startOfMonth(z)
  }
}

function next(d: TZDate, bucket: Bucket): TZDate {
  switch (bucket) {
    case "HOUR":
      return addHours(d, 1)
    case "DAY":
      return addDays(d, 1)
    case "WEEK":
      return addWeeks(d, 1)
    case "MONTH":
      return addMonths(d, 1)
  }
}

export function bucketLabel(d: Date, bucket: Bucket, tz = DEFAULT_TIMEZONE, long = false): string {
  const z = new TZDate(d, tz)
  const fmt = {
    HOUR: long ? "dd/MM/yyyy HH:mm" : "dd/MM HH'h'",
    DAY: long ? "dd/MM/yyyy" : "dd/MM",
    WEEK: long ? "'Semana de' dd/MM/yyyy" : "dd/MM",
    MONTH: long ? "MMMM 'de' yyyy" : "MMM/yy",
  }[bucket]
  return format(z, fmt, { locale: ptBR })
}

export interface SeriesRow {
  start: Date
  label: string
  /** null = nenhum pacote recebido no bucket (sem dado ≠ chuva zero). */
  mm: number | null
  readings: number
  /** Leituras esperadas no bucket (duração ÷ intervalo de envio). null se o intervalo é desconhecido. */
  expected: number | null
  /** 0–100; null se não dá para estimar. */
  coverage: number | null
}

export interface SeriesTable {
  rows: SeriesRow[]
  totalMm: number
  readings: number
  expected: number | null
  coverage: number | null
  bucketsWithData: number
}

/**
 * Completa a série da API com os buckets vazios (a API omite buckets sem leitura)
 * e estima a cobertura temporal de cada bucket a partir de readingsCount e do
 * intervalo de envio reportado pela estação.
 */
export function buildSeriesTable(series: PrecipitationSeries, sendIntervalS?: number | null): SeriesTable {
  const tz = series.timezone || DEFAULT_TIMEZONE
  const from = new Date(series.from)
  const to = new Date(series.to)
  const byStart = new Map(series.points.map((p) => [new Date(p.bucketStart).getTime(), p]))
  const rows: SeriesRow[] = []
  let cur = align(from, series.bucket, tz)
  let guard = 0
  while (cur.getTime() < to.getTime() && guard++ < 20_000) {
    const nxt = next(cur, series.bucket)
    const start = new Date(cur.getTime())
    const effSeconds = (Math.min(nxt.getTime(), to.getTime()) - Math.max(cur.getTime(), from.getTime())) / 1000
    const p = byStart.get(start.getTime())
    byStart.delete(start.getTime())
    const expected = sendIntervalS && sendIntervalS > 0 ? effSeconds / sendIntervalS : null
    const readings = p?.readingsCount ?? 0
    rows.push({
      start,
      label: bucketLabel(start, series.bucket, tz),
      mm: p ? p.precipitationMm : null,
      readings,
      expected,
      coverage: expected ? Math.min(100, (readings / expected) * 100) : null,
    })
    cur = nxt
  }
  // Pontos que não casaram com o alinhamento local (fuso divergente) não são descartados.
  for (const p of byStart.values()) {
    const start = new Date(p.bucketStart)
    rows.push({
      start,
      label: bucketLabel(start, series.bucket, tz),
      mm: p.precipitationMm,
      readings: p.readingsCount,
      expected: null,
      coverage: null,
    })
  }
  rows.sort((a, b) => a.start.getTime() - b.start.getTime())
  const readings = rows.reduce((s, r) => s + r.readings, 0)
  const expectedRows = rows.filter((r) => r.expected != null)
  const expected = expectedRows.length === rows.length ? rows.reduce((s, r) => s + (r.expected ?? 0), 0) : null
  return {
    rows,
    totalMm: series.totalMm,
    readings,
    expected,
    coverage: expected ? Math.min(100, (readings / expected) * 100) : null,
    bucketsWithData: rows.filter((r) => r.mm != null).length,
  }
}

/**
 * Como `chunkRange`, mas cada corte cai num início de bucket (no fuso), para nenhum bucket
 * ficar dividido entre duas requisições (importante em WEEK/MONTH).
 */
export function chunkRangeByBucket(r: DateRange, bucket: Bucket, maxDays: number, tz = DEFAULT_TIMEZONE): DateRange[] {
  const out: DateRange[] = []
  let cur = r.from.getTime()
  const end = r.to.getTime()
  while (cur < end) {
    let cut = Math.min(cur + maxDays * 86_400_000, end)
    if (cut < end) {
      const aligned = align(new Date(cut), bucket, tz).getTime()
      if (aligned > cur) cut = aligned
    }
    out.push({ from: new Date(cur), to: new Date(cut) })
    cur = cut
  }
  return out
}

/** Divide [from, to) em janelas de no máximo `maxDays` dias. */
export function chunkRange(r: DateRange, maxDays: number): DateRange[] {
  const out: DateRange[] = []
  let cur = r.from.getTime()
  const step = maxDays * 86_400_000
  while (cur < r.to.getTime()) {
    const end = Math.min(cur + step, r.to.getTime())
    out.push({ from: new Date(cur), to: new Date(end) })
    cur = end
  }
  return out
}
