import { Link } from "react-router"
import { LocateFixed, MapPinned, MapPinOff } from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { GeoState } from "@/hooks/use-geolocation"
import type { PublicStationSummary } from "@/lib/api/types"
import { fmt24h, fmtRelative, hasDataWithin } from "@/lib/format"
import { nearest } from "@/lib/geo"
import { cn } from "@/lib/utils"

const LIMIT = 3

/** Nuvem cinza do card; com gotas caindo se houve chuva medida nas últimas 24 h. */
function WeatherCloud({ rain }: { rain: boolean }) {
  const label = rain ? "Choveu nas últimas 24 h" : "Sem chuva registrada nas últimas 24 h"
  return (
    <svg viewBox="0 0 64 60" role="img" aria-label={label} className="pluvio station-cloud h-auto w-20">
      <title>{label}</title>
      {rain && (
        <g stroke="var(--chart-2)" strokeWidth="2.5" strokeLinecap="round">
          {[
            [22, 0],
            [32, 0.45],
            [42, 0.2],
            [27, 0.7],
            [37, 0.95],
          ].map(([x, d], i) => (
            <line key={i} className="station-drop" x1={x} y1="42" x2={x! - 1.5} y2="48" style={{ animationDelay: `${d}s` }} />
          ))}
        </g>
      )}
      <g className="station-cloud-body">
        <circle cx="22" cy="27" r="11" />
        <circle cx="35" cy="21" r="14" />
        <circle cx="47" cy="29" r="9" />
        <rect x="11" y="27" width="45" height="13" rx="6.5" />
      </g>
    </svg>
  )
}

function StationCard({ station }: { station: PublicStationSummary }) {
  const rain = hasDataWithin(station.lastReadingAt, 24) && station.last24hMm > 0
  return (
    <Link to={`/estacoes/${station.id}`} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="relative h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div aria-hidden className={cn("pointer-events-none absolute -top-10 -right-10 size-36 rounded-full blur-2xl", rain ? "bg-chart-2/15" : "bg-muted-foreground/5")} />
        <div className="absolute top-2 right-3">
          <WeatherCloud rain={rain} />
        </div>
        <CardContent className="relative flex flex-col gap-1 pr-28">
          <h3 className="truncate font-semibold">{station.name}</h3>
          <p className="text-sm text-muted-foreground">Atualizado {fmtRelative(station.lastReadingAt)}</p>
          <p className="mt-3 text-xs text-muted-foreground">Últimas 24 h</p>
          <p className="text-2xl font-semibold tabular-nums">{fmt24h(station.last24hMm, station.lastReadingAt)}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

/** Um botão só: pede a localização, mostra que está obtendo e indica quando o navegador bloqueou. */
function LocationButton({ geo, onRetry }: { geo: GeoState; onRetry: () => void }) {
  if (geo.status === "granted" || geo.status === "unavailable") return null
  if (geo.status === "pending")
    return (
      <Button variant="outline" size="sm" disabled>
        <Spinner data-icon="inline-start" /> Obtendo localização…
      </Button>
    )
  const denied = geo.status === "denied"
  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (denied) toast.info("A localização está bloqueada para este site. Libere nas configurações do navegador (ícone ao lado do endereço) e tente de novo.")
        onRetry()
      }}
    >
      {denied ? <MapPinOff data-icon="inline-start" /> : <LocateFixed data-icon="inline-start" />}
      {denied ? "Localização bloqueada" : "Usar minha localização"}
    </Button>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{denied ? "Libere a localização no navegador para ver as estações mais próximas" : "Ver as estações mais próximas de você"}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Estações públicas mais próximas do visitante (geolocalização do navegador). Sem permissão, mostra as
 * estações públicas que enviaram dados por último.
 */
export function NearbyStations({ stations, geo, onRetry }: { stations: PublicStationSummary[] | undefined; geo: GeoState; onRetry: () => void }) {
  const list = useMemo(() => {
    if (!stations) return undefined
    if (geo.status === "granted") return nearest(stations, geo.coords, LIMIT)
    return [...stations].sort((a, b) => (b.lastReadingAt ?? "").localeCompare(a.lastReadingAt ?? "")).slice(0, LIMIT)
  }, [stations, geo])

  const located = geo.status === "granted"

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-10 md:px-8" aria-labelledby="nearby-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="nearby-title" className="text-2xl font-semibold">
          {located ? "Estações perto de você" : "Estações públicas"}
        </h2>
        <div className="flex items-center gap-2">
          <LocationButton geo={geo} onRetry={onRetry} />
          <Button asChild variant="link" className="px-0">
            <Link to="/estacoes">Ver todas →</Link>
          </Button>
        </div>
      </div>

      {!list ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: LIMIT }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
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
          {list.map((s) => (
            <StationCard key={s.id} station={s} />
          ))}
        </div>
      )}
    </section>
  )
}
