import { GitCompare } from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi, stationsApi } from "@/lib/api/endpoints"
import { fmtMm } from "@/lib/format"
import { bucketLabel, buildSeriesTable, dayRange, type SeriesTable } from "@/lib/period"
import { CoverageBadge } from "@/components/common/status-badges"
import { QueryError } from "@/components/common/query-error"
import { PeriodControls, periodFromPreset, type PeriodState } from "./period-controls"

export interface CompareStation {
  id: string
  name: string
  sendIntervalS?: number | null
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const MAX = 5

/** Compara a chuva de 2 a 5 estações no mesmo período e granularidade. */
export function Comparison({ stations, mode }: { stations: CompareStation[]; mode: "private" | "public" }) {
  const [selected, setSelected] = useState<string[]>(() => stations.slice(0, 2).map((s) => s.id))
  const [period, setPeriod] = useState<PeriodState>(() => periodFromPreset("30"))
  const range = useMemo(() => dayRange(period.fromDay, period.toDay), [period.fromDay, period.toDay])
  const params = { bucket: period.bucket, from: range.from.toISOString(), to: range.to.toISOString() }
  const chosen = stations.filter((s) => selected.includes(s.id))

  const ids = chosen.map((s) => s.id).join(",")
  const q = useFetch(
    (signal) =>
      Promise.all(
        chosen.map(async (s) => ({
          id: s.id,
          series: await (mode === "public" ? publicApi.precipitation(s.id, params, signal) : stationsApi.precipitation(s.id, params, signal)),
        })),
      ),
    [mode, ids, params.bucket, params.from, params.to],
  )

  const tables: (SeriesTable | null)[] = chosen.map((s) => {
    const r = q.data?.find((x) => x.id === s.id)
    return r ? buildSeriesTable(r.series, mode === "public" ? null : s.sendIntervalS) : null
  })
  const loading = tables.some((t) => !t)
  const error = q.error

  const config: ChartConfig = Object.fromEntries(chosen.map((s, i) => [s.id, { label: s.name, color: COLORS[i % COLORS.length] }]))
  const byStart = new Map<number, Record<string, number | string | null>>()
  if (!loading)
    tables.forEach((t, i) =>
      t!.rows.forEach((r) => {
        const k = r.start.getTime()
        const row = byStart.get(k) ?? { label: bucketLabel(r.start, period.bucket), start: k }
        row[chosen[i]!.id] = r.mm
        byStart.set(k, row)
      }),
    )
  const data = [...byStart.values()].sort((a, b) => (a.start as number) - (b.start as number))

  if (stations.length < 2)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GitCompare />
          </EmptyMedia>
          <EmptyTitle>São necessárias ao menos duas estações</EmptyTitle>
          <EmptyDescription>Cadastre ou torne públicas mais estações para comparar.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Estações</CardTitle>
          <CardDescription>Escolha de 2 a {MAX} estações. Mesmo período e critério para todas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleGroup
            type="multiple"
            variant="outline"
            spacing={2}
            value={selected}
            onValueChange={(v) => v.length <= MAX && setSelected(v)}
            className="flex-wrap"
          >
            {stations.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} className="data-[state=on]:border-primary data-[state=on]:bg-primary/15">
                {s.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <PeriodControls value={period} onChange={setPeriod} />
        </CardContent>
      </Card>

      {chosen.length < 2 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Selecione ao menos duas estações</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : error ? (
        <QueryError error={error} onRetry={q.reload} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {chosen.map((s, i) => {
              const t = tables[i]
              return (
                <Card key={s.id} size="sm" className="border-l-4" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
                  <CardHeader>
                    <CardDescription className="truncate">{s.name}</CardDescription>
                    <CardTitle className="text-xl tabular-nums">
                      {t ? fmtMm(t.bucketsWithData ? t.totalMm : null) : <Skeleton className="h-6 w-20" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                    Cobertura <CoverageBadge value={t?.coverage} />
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Card>
            <CardContent>
              {loading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ChartContainer config={config} className="aspect-auto h-80 w-full">
                  <BarChart data={data} margin={{ top: 8, left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={44} unit=" mm" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex w-full justify-between gap-4">
                              <span className="text-muted-foreground">{config[name as string]?.label}</span>
                              <span className="font-mono">{fmtMm(value as number | null)}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {chosen.map((s) => (
                      <Bar key={s.id} dataKey={s.id} fill={`var(--color-${s.id})`} radius={[3, 3, 0, 0]} maxBarSize={24} />
                    ))}
                  </BarChart>
                </ChartContainer>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Intervalos sem barra não têm leitura (sem dado ≠ chuva zero). Compare acumulados só quando a cobertura das estações for parecida.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
