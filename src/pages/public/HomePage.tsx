import { Link } from "react-router"
import { ArrowRight, CloudRain, MapPinned, Radio } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { FreshnessBadge } from "@/components/common/status-badges"
import { QueryError } from "@/components/common/query-error"
import { StationMap, type MapPoint } from "@/components/station/station-map"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi } from "@/lib/api/endpoints"
import { fmt24h, fmtRelative, hasDataWithin } from "@/lib/format"

export function HomePage() {
  const q = useFetch(() => publicApi.list(), [], { intervalMs: 5 * 60_000 })
  const stations = useMemo(() => q.data ?? [], [q.data])
  const points = useMemo<MapPoint[]>(
    () => stations.map((s) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude, info: [`24 h: ${fmt24h(s.last24hMm, s.lastReadingAt)}`], href: "public" })),
    [stations],
  )
  const active = stations.filter((s) => hasDataWithin(s.lastReadingAt, 24)).length

  return (
    <>
      <section className="border-b bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr] md:px-8 md:py-20">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-medium text-muted-foreground">Instituto Federal Farroupilha</p>
            <h1 className="text-4xl leading-[1.1] font-bold tracking-[-0.02em] md:text-5xl">Chuva medida no campo, com transparência sobre cada lacuna.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              O PluvIFFar reúne pluviômetros instalados em propriedades rurais e mostra quanto choveu — e quando o equipamento não estava enviando dados.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link to="/mapa">
                  Abrir o mapa <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <Card>
              <CardHeader>
                <CloudRain className="size-5 text-muted-foreground" />
                <CardTitle className="text-3xl tabular-nums">{!q.data ? <Skeleton className="h-9 w-12" /> : stations.length}</CardTitle>
                <CardDescription>estações públicas</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Radio className="size-5 text-muted-foreground" />
                <CardTitle className="text-3xl tabular-nums">{!q.data ? <Skeleton className="h-9 w-12" /> : active}</CardTitle>
                <CardDescription>com dados nas últimas 24 h</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Mapa de estações públicas</h2>
          <Button asChild variant="link">
            <Link to="/mapa">Tela cheia →</Link>
          </Button>
        </div>
        {q.error ? <QueryError error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton className="h-[420px] w-full rounded-xl" /> : <StationMap points={points} />}
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-14 md:px-8">
        <h2 className="text-2xl font-semibold">Últimos registros</h2>
        {!q.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : stations.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinned />
              </EmptyMedia>
              <EmptyTitle>Ainda não há estações públicas</EmptyTitle>
              <EmptyDescription>Os produtores escolhem quais estações aparecem aqui.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stations.map((s) => (
              <Link key={s.id} to={`/estacoes/${s.id}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="truncate">{s.name}</CardTitle>
                    <CardDescription>Atualizado {fmtRelative(s.lastReadingAt)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">Últimas 24 h</div>
                    <div className="text-2xl font-semibold tabular-nums">{fmt24h(s.last24hMm, s.lastReadingAt)}</div>
                  </CardContent>
                  <CardFooter>
                    <FreshnessBadge at={s.lastReadingAt} />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
