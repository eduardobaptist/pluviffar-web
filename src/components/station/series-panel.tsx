import { CalendarDays, ChartColumn, Info, TableIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi, stationsApi } from "@/lib/api/endpoints"
import { fmtMm, fmtPct } from "@/lib/format"
import type { Bucket } from "@/lib/api/types"
import { bucketLabel, buildSeriesTable, calendarDays, dayRange, MAX_DAYS } from "@/lib/period"
import { CoverageBadge } from "@/components/common/status-badges"
import { QueryError } from "@/components/common/query-error"
import { cn } from "@/lib/utils"
import { PeriodControls, periodFromPreset, type PeriodState } from "./period-controls"
import { PrecipitationChart } from "./precipitation-chart"
import { RainCalendar } from "./rain-calendar"

/** Série de chuva com seletor de período/granularidade, abas Gráfico (agregação escolhida) / Calendário (sempre diário), resumo e tabela. */
export function SeriesPanel({
  stationId,
  mode,
  sendIntervalS,
  initial = "30",
  chartClassName,
}: {
  stationId: string
  mode: "private" | "public"
  sendIntervalS?: number | null
  initial?: "1" | "7" | "30" | "90" | "365"
  /** Altura do gráfico (padrão `h-72`); o painel usa um gráfico maior. */
  chartClassName?: string
}) {
  const [period, setPeriod] = useState<PeriodState>(() => periodFromPreset(initial))
  const [showTable, setShowTable] = useState(false)
  const [view, setView] = useState<"grafico" | "calendario">("grafico")
  const range = useMemo(() => dayRange(period.fromDay, period.toDay), [period.fromDay, period.toDay])
  // O calendário é sempre diário; o "Agrupar por" vale só para o gráfico.
  const calendarTooLong = view === "calendario" && calendarDays(period.fromDay, period.toDay) > MAX_DAYS.DAY
  const bucket: Bucket = view === "calendario" && !calendarTooLong ? "DAY" : period.bucket
  const params = { bucket, from: range.from.toISOString(), to: range.to.toISOString() }
  const q = useFetch(
    (signal) => (mode === "public" ? publicApi.precipitation(stationId, params, signal) : stationsApi.precipitation(stationId, params, signal)),
    [mode, stationId, params.bucket, params.from, params.to],
    { keepPrevious: true },
  )
  // Com keepPrevious, a resposta anterior pode ser de outra granularidade (troca de aba): espera a certa.
  const data = q.data?.bucket === bucket ? q.data : undefined
  const table = useMemo(() => (data ? buildSeriesTable(data, mode === "public" ? null : sendIntervalS) : null), [data, mode, sendIntervalS])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chuva no período</CardTitle>
        <CardDescription>
          {table ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-lg font-semibold text-foreground tabular-nums">{fmtMm(table.bucketsWithData ? table.totalMm : null)}</span>
              {mode === "private" && (
                <span className="flex items-center gap-1">
                  cobertura <CoverageBadge value={table.coverage} />
                </span>
              )}
              <span>
                {table.rows.length - table.bucketsWithData} de {table.rows.length} intervalos sem dados
              </span>
            </span>
          ) : (
            <Skeleton className="h-6 w-60" />
          )}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
            <TableIcon data-icon="inline-start" /> {showTable ? "Ocultar tabela" : "Ver tabela"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PeriodControls value={period} onChange={setPeriod} showBucket={view === "grafico"} />
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="grafico">
              <ChartColumn /> Gráfico
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <CalendarDays /> Calendário
            </TabsTrigger>
          </TabsList>
          {q.error ? (
            <QueryError error={q.error} onRetry={q.reload} />
          ) : !table ? (
            <Skeleton className={cn("h-72 w-full", chartClassName)} />
          ) : (
            <div className={q.loading ? "opacity-60 transition-opacity" : undefined}>
              <TabsContent value="grafico" className="pt-2">
                <PrecipitationChart rows={table.rows} bucket={bucket} {...(chartClassName ? { className: cn("aspect-auto w-full", chartClassName) } : {})} />
              </TabsContent>
              <TabsContent value="calendario" className="pt-2">
                {calendarTooLong ? (
                  <Alert>
                    <Info />
                    <AlertDescription>O calendário mostra no máximo {MAX_DAYS.DAY} dias. Escolha um período menor.</AlertDescription>
                  </Alert>
                ) : (
                  <RainCalendar rows={table.rows} />
                )}
              </TabsContent>
            </div>
          )}
        </Tabs>
        <Alert>
          <Info />
          <AlertDescription>
            Intervalos sem leitura aparecem como “Sem dados” (traço cinza no gráfico, célula hachurada no calendário): ausência de pacote nunca é tratada como chuva zero.
            {mode === "private" && " Cobertura = leituras recebidas ÷ esperadas pelo intervalo de envio reportado."}
          </AlertDescription>
        </Alert>
        {showTable && table && (
          <div className="max-h-96 overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Chuva</TableHead>
                  <TableHead className="text-right">Leituras</TableHead>
                  {mode === "private" && <TableHead className="text-right">Cobertura</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...table.rows].reverse().map((r) => (
                  <TableRow key={r.start.getTime()}>
                    <TableCell>{bucketLabel(r.start, bucket, undefined, true)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMm(r.mm)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.readings}</TableCell>
                    {mode === "private" && <TableCell className="text-right tabular-nums">{fmtPct(r.coverage)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
