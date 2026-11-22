import { TZDate } from "@date-fns/tz"
import { format, getDaysInMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DEFAULT_TIMEZONE } from "./api/endpoints"
import type { SeriesRow } from "./period"

/**
 * Escala de cores do calendário pluviométrico (chuva diária): limites fixos em mm,
 * para que a mesma cor signifique a mesma chuva entre estações e períodos.
 * Nível 0 = 0 mm (com leitura); 1…6 = faixas crescentes; null = sem dados.
 */
export const RAIN_THRESHOLDS = [1, 5, 10, 25, 50] as const

export type RainLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function rainLevel(mm: number | null): RainLevel | null {
  if (mm == null) return null
  if (mm <= 0) return 0
  const i = RAIN_THRESHOLDS.findIndex((limit) => mm < limit)
  return (i === -1 ? 6 : i + 1) as RainLevel
}

/** Classes Tailwind por faixa (calendário, legenda). */
// Classes estáticas: o Tailwind precisa enxergar os nomes completos.
export const RAIN_LEVEL_CLASS: Record<RainLevel, string> = {
  0: "border border-border bg-card text-foreground",
  1: "bg-rain-1 text-rain-1-foreground",
  2: "bg-rain-2 text-rain-2-foreground",
  3: "bg-rain-3 text-rain-3-foreground",
  4: "bg-rain-4 text-rain-4-foreground",
  5: "bg-rain-5 text-rain-5-foreground",
  6: "bg-rain-6 text-rain-6-foreground",
}
export const RAIN_NO_DATA_CLASS =
  "border border-dashed border-muted-foreground/40 text-muted-foreground bg-[repeating-linear-gradient(135deg,var(--muted)_0_3px,transparent_3px_6px)]"

const legendNf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

/** Rótulos da legenda (faixas em mm). */
export function rainLegend(): { level: RainLevel; label: string }[] {
  const t = RAIN_THRESHOLDS.map((v) => legendNf.format(v))
  return [
    { level: 0, label: "0" },
    { level: 1, label: `< ${t[0]}` },
    { level: 2, label: `${t[0]}–${t[1]}` },
    { level: 3, label: `${t[1]}–${t[2]}` },
    { level: 4, label: `${t[2]}–${t[3]}` },
    { level: 5, label: `${t[3]}–${t[4]}` },
    { level: 6, label: `≥ ${t[4]}` },
  ]
}

/** Soma dos dias de um mês: nunca trata ausência como zero. */
export interface MonthTotal {
  /** null = nenhum dia do mês tem leitura. */
  mm: number | null
  /** Dias do mês dentro do período sem nenhuma leitura. */
  missing: number
  /** true se faltam dias (sem dados ou fora do período) — o total é só do que foi medido. */
  partial: boolean
}

function monthTotal(cells: (SeriesRow | undefined)[]): MonthTotal {
  let mm: number | null = null
  let missing = 0
  let outside = 0
  for (const c of cells) {
    if (!c) outside++
    else if (c.mm == null) missing++
    else mm = (mm ?? 0) + c.mm
  }
  return { mm, missing, partial: missing > 0 || outside > 0 }
}

export interface MonthOfDays {
  key: string
  label: string
  /** Dia da semana do dia 1 (0 = domingo). */
  offset: number
  /** Um item por dia do mês; undefined = fora do período consultado. */
  days: (SeriesRow | undefined)[]
  total: MonthTotal
}

/** Série diária → um bloco por mês, alinhado por dia da semana. */
export function groupDaysByMonth(rows: SeriesRow[], tz = DEFAULT_TIMEZONE): MonthOfDays[] {
  const months = new Map<string, MonthOfDays>()
  for (const r of rows) {
    const z = new TZDate(r.start, tz)
    const key = format(z, "yyyy-MM")
    let m = months.get(key)
    if (!m) {
      const first = new TZDate(z.getFullYear(), z.getMonth(), 1, tz)
      m = {
        key,
        label: format(first, "MMMM 'de' yyyy", { locale: ptBR }),
        offset: first.getDay(),
        days: Array.from({ length: getDaysInMonth(first) }, () => undefined),
        total: { mm: null, missing: 0, partial: true },
      }
      months.set(key, m)
    }
    m.days[z.getDate() - 1] = r
  }
  const out = [...months.values()]
  for (const m of out) m.total = monthTotal(m.days)
  return out
}
