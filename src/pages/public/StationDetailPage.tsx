import { Link, useParams } from "react-router"
import { ChevronLeft, Download, LineChart, SearchX } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/common/page-header"
import { FreshnessBadge } from "@/components/common/status-badges"
import { QueryError } from "@/components/common/query-error"
import { ExportForm } from "@/components/station/export-form"
import { RainTotals } from "@/components/station/rain-totals"
import { SeriesPanel } from "@/components/station/series-panel"
import { StationMap } from "@/components/station/station-map"
import { isApiError } from "@/lib/api/client"
import { useFetch } from "@/hooks/use-fetch"
import { useZodSearch } from "@/hooks/use-zod-search"
import { publicApi } from "@/lib/api/endpoints"
import { fmtDateTime } from "@/lib/format"

const searchSchema = z.object({ tab: z.enum(["chuva", "exportar"]).catch("chuva").default("chuva") })

export function PublicStationDetailPage() {
  const id = useParams().id!
  const [{ tab }, setSearch] = useZodSearch(searchSchema)
  const q = useFetch(() => publicApi.get(id), [id])
  const s = q.data
  const points = useMemo(() => (s ? [{ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude }] : []), [s])

  if (q.error && isApiError(q.error, "STATION_NOT_FOUND"))
    return (
      <div className="mx-auto max-w-3xl p-10">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Estação não encontrada</EmptyTitle>
            <EmptyDescription>Ela não existe ou deixou de ser pública.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link to="/estacoes">Ver estações públicas</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/estacoes">
          <ChevronLeft data-icon="inline-start" /> Estações públicas
        </Link>
      </Button>
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <>
          <PageHeader
            title={s?.name ?? <Skeleton className="h-9 w-64" />}
            description={s ? `Última leitura: ${fmtDateTime(s.lastReadingAt)} · fuso ${s.timezone}` : undefined}
            actions={s && <FreshnessBadge at={s.lastReadingAt} />}
          />
          <RainTotals totals={s?.precipitation} coverage={null} neverReported={s ? !s.lastReadingAt : false} />
          <Tabs value={tab} onValueChange={(t) => setSearch({ tab: t as "chuva" | "exportar" }, { replace: true })}>
            <TabsList>
              <TabsTrigger value="chuva">
                <LineChart /> Chuva
              </TabsTrigger>
              <TabsTrigger value="exportar">
                <Download /> Exportar dados
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chuva" className="flex flex-col gap-6 pt-2">
              <SeriesPanel stationId={id} mode="public" />
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent>{s ? <StationMap points={points} className="h-72" /> : <Skeleton className="h-72" />}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="exportar" className="pt-2">
              <Card>
                <CardHeader>
                  <CardTitle>Exportar série de chuva</CardTitle>
                  <CardDescription>A área pública disponibiliza a série agregada (hora, dia, semana ou mês) em CSV ou Excel.</CardDescription>
                </CardHeader>
                <CardContent>{s && <ExportForm stations={[{ id: s.id, name: s.name }]} publicMode lockStations />}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
