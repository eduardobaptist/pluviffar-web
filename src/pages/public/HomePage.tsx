import { Link } from "react-router"
import { ArrowRight } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { QueryError } from "@/components/common/query-error"
import { NearbyStations } from "@/components/home/nearby-stations"
import { RainGaugeAnimation } from "@/components/home/rain-gauge-animation"
import { StationMap, type MapPoint } from "@/components/station/station-map"
import { useFetch } from "@/hooks/use-fetch"
import { useGeolocation } from "@/hooks/use-geolocation"
import { publicApi } from "@/lib/api/endpoints"
import { fmt24h } from "@/lib/format"

/** Palavra em destaque no título: marca-texto em faixa baixa (tokens, legível nos dois temas). */
function Highlight({ children, tone }: { children: React.ReactNode; tone: "field" | "home" }) {
  return (
    <span
      className={
        tone === "field"
          ? "box-decoration-clone bg-linear-to-t from-rain-2 from-40% to-transparent to-40% -mx-0.5 px-1"
          : "box-decoration-clone bg-linear-to-t from-chart-2/35 from-40% to-transparent to-40% -mx-0.5 px-1"
      }
    >
      {children}
    </span>
  )
}

export function HomePage() {
  const q = useFetch(() => publicApi.list(), [], { intervalMs: 5 * 60_000 })
  const geo = useGeolocation()
  const points = useMemo<MapPoint[]>(
    () => (q.data ?? []).map((s) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude, info: [`24 h: ${fmt24h(s.last24hMm, s.lastReadingAt)}`], href: "public" })),
    [q.data],
  )

  return (
    <>
      <section className="overflow-hidden border-b bg-muted/40">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-[1.25fr_1fr] md:gap-10 md:px-8 md:py-20">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-medium text-muted-foreground">Instituto Federal Farroupilha</p>
            <h1 className="text-4xl leading-[1.15] font-bold tracking-[-0.02em] sm:text-5xl md:text-[2.75rem] lg:text-5xl">
              Chuva medida no <Highlight tone="field">campo</Highlight>,<br className="hidden lg:block" /> sem sair de <Highlight tone="home">casa</Highlight>.
            </h1>
            <p className="max-w-lg text-lg text-pretty text-muted-foreground">
              Nosso <strong className="font-semibold text-foreground">pluviômetro automático</strong> mede cada milímetro sozinho e manda tudo para o seu celular. Saiba
              quanto choveu na lavoura, na hora, de onde estiver.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="lg">
                <Link to="/mapa">
                  Abrir o mapa <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sobre">Como funciona</Link>
              </Button>
            </div>
          </div>
          <RainGaugeAnimation className="max-w-[20rem] sm:max-w-[23rem] md:max-w-[26rem]" />
        </div>
      </section>

      {!q.error && <NearbyStations stations={q.data} geo={geo} onRetry={geo.retry} />}

      <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:px-8 md:pb-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Mapa de estações públicas</h2>
          <Button asChild variant="link" className="px-0">
            <Link to="/mapa">Tela cheia →</Link>
          </Button>
        </div>
        {q.error ? <QueryError error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton className="h-[420px] w-full rounded-xl" /> : <StationMap points={points} />}
      </section>
    </>
  )
}
