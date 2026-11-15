import { Info, TableIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi, stationsApi } from "@/lib/api/endpoints"
import { fmtMm, fmtPct } from "@/lib/format"
import { bucketLabel, buildSeriesTable, dayRange } from "@/lib/period"
import { CoverageBadge } from "@/components/common/status-badges"
import { QueryError } from "@/components/common/query-error"
import { cn } from "@/lib/utils"
import { PeriodControls, periodFromPreset, type PeriodState } from "./period-controls"
import { PrecipitationChart } from "./precipitation-chart"

/** Série de chuva com seletor de período/granularidade, gráfico, resumo e tabela. */
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
  const range = useMemo(() => dayRange(period.fromDay, period.toDay), [period.fromDay, period.toDay])
  const params = { bucket: period.bucket, from: range.from.toISOString(), to: range.to.toISOString() }
  const q = useFetch(
    (signal) => (mode === "public" ? publicApi.precipitation(stationId, params, signal) : stationsApi.precipitation(stationId, params, signal)),
    [mode, stationId, params.bucket, params.from, params.to],
    { keepPrevious: true },
  )
  const table = useMemo(() => (q.data ? buildSeriesTable(q.data, mode === "public" ? null : sendIntervalS) : null), [q.data, mode, sendIntervalS])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chuva no período</CardTitle>
        <CardDescription>
          {table ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-lg font-semibold text-foreground tabular-nums">{fmtMm(table.bucketsWithData ? table.totalMm : null)}</span>
              <span className="flex items-center gap-1">
                cobertura <CoverageBadge value={table.coverage} />
              </span>
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
        <PeriodControls value={period} onChange={setPeriod} />
        {q.error ? (
          <QueryError error={q.error} onRetry={q.reload} />
        ) : !table ? (
          <Skeleton className={cn("h-72 w-full", chartClassName)} />
        ) : (
          <div className={q.loading ? "opacity-60 transition-opacity" : undefined}>
            <PrecipitationChart rows={table.rows} bucket={period.bucket} {...(chartClassName ? { className: cn("aspect-auto w-full", chartClassName) } : {})} />
          </div>
        )}
        <Alert>
          <Info />
          <AlertDescription>
            Intervalos sem leitura aparecem como “Sem dados” (traço cinza): ausência de pacote nunca é tratada como chuva zero.
            {mode === "public"
              ? " Na área pública a cobertura não é estimável (o intervalo de envio não é divulgado)."
              : " Cobertura = leituras recebidas ÷ esperadas pelo intervalo de envio reportado."}
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
                  <TableHead className="text-right">Cobertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...table.rows].reverse().map((r) => (
                  <TableRow key={r.start.getTime()}>
                    <TableCell>{bucketLabel(r.start, period.bucket, undefined, true)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMm(r.mm)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.readings}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(r.coverage)}</TableCell>
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
