import { subDays, subHours } from "date-fns"
import { AlertTriangle, CloudRain } from "lucide-react"
import { useMemo } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useFetch } from "@/hooks/use-fetch"
import { stationsApi } from "@/lib/api/endpoints"
import type { PrecipitationTotals } from "@/lib/api/types"
import { fmtMm, fmtMmValue } from "@/lib/format"
import { buildSeriesTable, dayRange } from "@/lib/period"
import { CoverageBadge } from "@/components/common/status-badges"
import { cn } from "@/lib/utils"

export interface TotalsCoverage {
  today: number | null
  last24h: number | null
  last7d: number | null
  last30d: number | null
}

function coverageOf(rows: { readings: number; expected: number | null }[]): number | null {
  if (!rows.length || rows.some((r) => r.expected == null)) return null
  const exp = rows.reduce((s, r) => s + (r.expected ?? 0), 0)
  return exp ? Math.min(100, (rows.reduce((s, r) => s + r.readings, 0) / exp) * 100) : null
}

/**
 * A API não devolve cobertura nos totais (ver "Falta na API"). Estimamos a partir
 * das séries HOUR (24 h) e DAY (30 dias) com o intervalo de envio da estação.
 */
export function useTotalsCoverage(stationId: string, sendIntervalS: number | null | undefined): TotalsCoverage | null {
  const enabled = !!sendIntervalS
  const q = useFetch(
    enabled
      ? (signal) => {
          const now = new Date()
          const d30 = dayRange(subDays(now, 29), now)
          return Promise.all([
            stationsApi.precipitation(stationId, { bucket: "HOUR", from: subHours(now, 24).toISOString(), to: now.toISOString() }, signal),
            stationsApi.precipitation(stationId, { bucket: "DAY", from: d30.from.toISOString(), to: d30.to.toISOString() }, signal),
          ])
        }
      : null,
    [stationId],
  )
  return useMemo(() => {
    if (!enabled || !q.data) return null
    const h = buildSeriesTable(q.data[0], sendIntervalS)
    const d = buildSeriesTable(q.data[1], sendIntervalS)
    return {
      last24h: h.coverage,
      today: coverageOf(d.rows.slice(-1)),
      last7d: coverageOf(d.rows.slice(-7)),
      last30d: d.coverage,
    }
  }, [enabled, q.data, sendIntervalS])
}

export type TotalsWindow = "today" | "last24h" | "last7d" | "last30d"

const ITEMS: { id: TotalsWindow; key: keyof PrecipitationTotals; cov: keyof TotalsCoverage; label: string }[] = [
  { id: "today", key: "todayMm", cov: "today", label: "Hoje" },
  { id: "last24h", key: "last24hMm", cov: "last24h", label: "Últimas 24 h" },
  { id: "last7d", key: "last7dMm", cov: "last7d", label: "7 dias" },
  { id: "last30d", key: "last30dMm", cov: "last30d", label: "30 dias" },
]

/** Acumulados de chuva, sempre acompanhados da cobertura temporal (ou do aviso de que não é estimável). */
export function RainTotals({
  totals,
  coverage,
  neverReported,
  windows,
  featured = false,
}: {
  totals: PrecipitationTotals | undefined
  coverage: TotalsCoverage | null
  /** Estação nunca enviou leitura → "Sem dados" em vez de 0 mm. */
  neverReported?: boolean
  /** Janelas exibidas (padrão: todas). */
  windows?: TotalsWindow[]
  /** Destaque (painel do produtor): números maiores e só o percentual de cobertura, sem o aviso "acumulado parcial". */
  featured?: boolean
}) {
  const items = windows ? ITEMS.filter((it) => windows.includes(it.id)) : ITEMS
  return (
    <div className={cn("grid gap-3", featured ? (items.length === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4") : "grid-cols-2 lg:grid-cols-4")}>
      {items.map((it) => {
        const cov = coverage?.[it.cov] ?? null
        const value = totals && !neverReported ? totals[it.key] : null
        if (featured)
          return (
            <Card key={it.key}>
              <CardHeader>
                <CardDescription className="flex items-center gap-2 text-base font-medium text-foreground md:text-lg">
                  <CloudRain className="size-5 text-rain" aria-hidden /> {it.label}
                </CardDescription>
                <CardAction className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  cobertura <CoverageBadge value={neverReported ? 0 : cov} />
                </CardAction>
                <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
                  {!totals ? (
                    <Skeleton className="h-10 w-32" />
                  ) : value == null ? (
                    <span className="text-3xl text-muted-foreground md:text-4xl">Sem dados</span>
                  ) : (
                    <>
                      {fmtMmValue(value)}
                      <span className="ml-1 text-lg font-medium text-muted-foreground md:text-xl">mm</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          )
        return (
          <Card key={it.key} size="sm">
            <CardHeader>
              <CardDescription>{it.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {totals ? fmtMm(value) : <Skeleton className="h-7 w-24" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              Cobertura <CoverageBadge value={neverReported ? 0 : cov} />
              {cov != null && cov < 99.5 && value != null && (
                <span className="flex items-center gap-1 text-warning-foreground">
                  <AlertTriangle className="size-3" /> acumulado parcial
                </span>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

