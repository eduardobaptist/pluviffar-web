import { Link, useParams } from "react-router"
import { ChevronLeft, Download, LineChart, MapPin, SearchX } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { ExportForm } from "@/components/station/export-form"
import { RainTotals } from "@/components/station/rain-totals"
import { SeriesPanel } from "@/components/station/series-panel"
import { StationMap } from "@/components/station/station-map"
import { isApiError } from "@/lib/api/client"
import { useFetch } from "@/hooks/use-fetch"
import { useZodSearch } from "@/hooks/use-zod-search"
import { publicApi } from "@/lib/api/endpoints"
import type { PublicStationDetail } from "@/lib/api/types"
import { fmtRelative } from "@/lib/format"

const TABS = ["chuva", "localizacao", "exportar"] as const
type Tab = (typeof TABS)[number]
const searchSchema = z.object({ tab: z.enum(TABS).catch("chuva").default("chuva") })

/** Abas da estação pública — mesmo padrão do `StationTabs` (logado), só com o que a área pública expõe. */
function PublicStationTabs({ station: s, tab, onTabChange }: { station: PublicStationDetail; tab: Tab; onTabChange: (t: Tab) => void }) {
  const points = useMemo(() => [{ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude }], [s.id, s.name, s.latitude, s.longitude])
  return (
    <Tabs value={tab} onValueChange={(t) => onTabChange(t as Tab)}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="chuva">
          <LineChart /> Chuva
        </TabsTrigger>
        <TabsTrigger value="localizacao">
          <MapPin /> Localização
        </TabsTrigger>
        <TabsTrigger value="exportar">
          <Download /> Exportar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chuva" className="pt-2">
        <div className="flex flex-col gap-4">
          <RainTotals totals={s.precipitation} coverage={null} showCoverage={false} neverReported={!s.lastReadingAt} windows={["today", "last7d", "last30d"]} featured />
          <SeriesPanel key={s.id} stationId={s.id} mode="public" initial="7" chartClassName="h-[clamp(18rem,45svh,30rem)]" />
        </div>
      </TabsContent>
      <TabsContent value="localizacao" className="pt-2">
        <Card>
          <CardHeader>
            <CardTitle>Localização</CardTitle>
            <CardDescription>
              {s.latitude}, {s.longitude}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StationMap points={points} className="h-[clamp(18rem,50svh,32rem)]" />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="exportar" className="pt-2">
        <Card>
          <CardHeader>
            <CardTitle>Exportar dados desta estação</CardTitle>
            <CardDescription>Série de chuva em CSV ou Excel.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExportForm stations={[{ id: s.id, name: s.name }]} publicMode lockStations />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export function PublicStationDetailPage() {
  const id = useParams().id!
  const [{ tab }, setSearch] = useZodSearch(searchSchema)
  const q = useFetch(() => publicApi.get(id), [id])
  const s = q.data

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
            description={
              s && (
                <span className="flex flex-wrap items-center gap-2">
                  <span>{s.lastReadingAt ? `última leitura ${fmtRelative(s.lastReadingAt)}` : "nunca enviou"}</span>·<span>fuso {s.timezone}</span>
                  <Badge>Pública</Badge>
                </span>
              )
            }
          />
          {s ? (
            <PublicStationTabs station={s} tab={tab} onTabChange={(t) => setSearch({ tab: t }, { replace: true })} />
          ) : (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-80 max-w-full" />
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-96 rounded-xl" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
