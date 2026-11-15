import { TZDate } from "@date-fns/tz"
import { format, formatDistanceToNowStrict } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DEFAULT_TIMEZONE } from "./api/endpoints"

const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })

/** Chuva em mm. `null`/`undefined` = sem dado — NUNCA vira "0 mm". */
/** Só o número (1 casa), para exibir a unidade à parte. */
export function fmtMmValue(v: number): string {
  return nf1.format(v)
}

export function fmtMm(v: number | null | undefined): string {
  return v == null ? "Sem dados" : `${nf1.format(v)} mm`
}

export function fmtNumber(v: number | null | undefined, suffix = ""): string {
  return v == null ? "—" : `${nf2.format(v)}${suffix}`
}

export function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${Math.round(v)}%`
}

export function toZoned(iso: string | Date, tz = DEFAULT_TIMEZONE): TZDate {
  return new TZDate(typeof iso === "string" ? new Date(iso) : iso, tz)
}

export function fmtDateTime(iso: string | null | undefined, tz = DEFAULT_TIMEZONE): string {
  return iso ? format(toZoned(iso, tz), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"
}

export function fmtDate(iso: string | Date | null | undefined, tz = DEFAULT_TIMEZONE): string {
  return iso ? format(toZoned(iso, tz), "dd/MM/yyyy", { locale: ptBR }) : "—"
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "nunca"
  return formatDistanceToNowStrict(new Date(iso), { locale: ptBR, addSuffix: true })
}

export function fmtUptime(s: number | null | undefined): string {
  if (s == null) return "—"
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}min`
}

export type Freshness = "online" | "late" | "offline" | "never"

/** Atualidade do último dado: online até 2× o intervalo de envio (mín. 30 min), atrasado até 24 h. */
export function freshness(iso: string | null | undefined, sendIntervalS?: number | null): Freshness {
  if (!iso) return "never"
  const age = Date.now() - new Date(iso).getTime()
  const onlineWindow = Math.max(30 * 60_000, (sendIntervalS ?? 0) * 2000)
  if (age <= onlineWindow) return "online"
  if (age <= 24 * 3600_000) return "late"
  return "offline"
}

export const ROLE_LABEL = { ADMIN: "Administrador", PRODUCER: "Produtor" } as const

/** Houve leitura nas últimas `hours` horas? Sem isso, um total "0 mm" seria enganoso. */
export function hasDataWithin(iso: string | null | undefined, hours: number): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() <= hours * 3600_000
}

/** Chuva de 24 h da área pública: "Sem dados" se não houve leitura nas últimas 24 h. */
export function fmt24h(mm: number, lastReadingAt: string | null | undefined): string {
  return hasDataWithin(lastReadingAt, 24) ? fmtMm(mm) : "Sem dados"
}
