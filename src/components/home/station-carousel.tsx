import { Link } from "react-router"
import { Clock, LocateFixed, MapPin, MapPinned, Navigation } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { GeoState } from "@/hooks/use-geolocation"
import type { PublicStationSummary } from "@/lib/api/types"
import { fmtMmValue, fmtRelative, hasDataWithin } from "@/lib/format"
import { nearest } from "@/lib/geo"
import { cn } from "@/lib/utils"

const LIMIT = 8
/** Tempo em cada estação no avanço automático. */
const AUTOPLAY_MS = 5000

type Item = PublicStationSummary & { distanceKm?: number }

/** Nuvem do card; com gotas caindo se houve chuva medida nas últimas 24 h. */
function WeatherCloud({ rain, className }: { rain: boolean; className?: string }) {
  const label = rain ? "Choveu nas últimas 24 h" : "Sem chuva registrada nas últimas 24 h"
  return (
    <svg viewBox="0 0 64 60" role="img" aria-label={label} className={cn("pluvio station-cloud h-auto", className)}>
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

function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km < 10 ? km.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : Math.round(km).toLocaleString("pt-BR")} km`
}

function StationSlide({ station: s, rank }: { station: Item; rank: number }) {
  const fresh = hasDataWithin(s.lastReadingAt, 24)
  const rain = fresh && s.last24hMm > 0
  const status = !fresh ? null : rain ? { label: "Choveu", cls: "border-transparent bg-chart-2/15 text-foreground" } : { label: "Sem chuva", cls: "" }

  return (
    <Link to={`/estacoes/${s.id}`} className="group block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="relative h-full gap-0 overflow-hidden py-0 shadow-card transition-[box-shadow,translate] group-hover:-translate-y-0.5 group-hover:shadow-md">
        {/* faixa superior: clima das últimas 24 h */}
        <div className={cn("relative flex items-start justify-between gap-3 px-6 pt-6 pb-3 md:px-7 md:pt-7", rain ? "bg-linear-to-br from-chart-2/20 via-chart-2/5 to-transparent" : "bg-linear-to-br from-muted to-transparent")}>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {s.distanceKm != null ? (
                <Badge variant="secondary" className="gap-1">
                  <Navigation className="size-3" aria-hidden /> {rank === 0 ? "Mais perto · " : ""}
                  {fmtDistance(s.distanceKm)}
                </Badge>
              ) : null}
              {status && (
                <Badge variant="outline" className={status.cls}>
                  {status.label}
                </Badge>
              )}
            </div>
            <h3 className="line-clamp-2 text-2xl leading-tight font-bold tracking-tight md:text-3xl">{s.name}</h3>
          </div>
          <WeatherCloud rain={rain} className="relative z-10 -mb-10 w-20 shrink-0 drop-shadow-sm sm:w-24 md:-mb-12 md:w-28" />
        </div>

        <CardContent className="flex flex-1 flex-col justify-center gap-1 px-6 pt-1 pb-3 md:px-7 md:pb-4">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground md:text-base">
            <Clock className="size-3.5" aria-hidden /> Chuva nas últimas 24 h
          </p>
          {fresh ? (
            <p className="flex items-baseline gap-1.5">
              <span className="text-6xl font-semibold tracking-tight tabular-nums md:text-7xl">{fmtMmValue(s.last24hMm)}</span>
              <span className="text-xl font-medium text-muted-foreground md:text-2xl">mm</span>
            </p>
          ) : (
            <p className="text-4xl font-semibold text-muted-foreground md:text-5xl">Sem dados</p>
          )}
          <p className="text-sm text-muted-foreground/80">
            {s.lastReadingAt ? `Última leitura ${fmtRelative(s.lastReadingAt)}` : "Ainda não enviou leituras"}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

/** Estado real da permissão (o Chrome devolve PERMISSION_DENIED também quando o prompt só foi fechado). */
async function permissionState(): Promise<PermissionState | "unknown"> {
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state
  } catch {
    return "unknown"
  }
}

/**
 * "Ativar localização": ao clicar, pede a posição de novo — o navegador mostra o prompt de permissão. Se o
 * site está bloqueado nas configurações, o navegador não pergunta mais; aí explica como liberar.
 */
function LocationButton({ geo, onRetry }: { geo: GeoState; onRetry: () => void }) {
  if (geo.status === "granted" || geo.status === "unavailable") return null
  if (geo.status === "pending")
    return (
      <Button variant="outline" size="sm" disabled>
        <Spinner data-icon="inline-start" /> Localizando…
      </Button>
    )
  return (
    <Button
      variant="outline"
      size="sm"
      title="Ver as estações mais próximas de você"
      onClick={async () => {
        if ((await permissionState()) === "denied")
          toast.info("A localização está bloqueada para este site. Libere no ícone ao lado do endereço do navegador e clique de novo.")
        onRetry()
      }}
    >
      <LocateFixed data-icon="inline-start" /> Ativar localização
    </Button>
  )
}

/**
 * Carrossel de estações públicas do hero: as mais próximas do visitante (geolocalização do navegador) ou,
 * sem permissão, as que enviaram dados por último.
 */
export function StationCarousel({ stations, geo, onRetry, className }: { stations: PublicStationSummary[] | undefined; geo: GeoState; onRetry: () => void; className?: string }) {
  const located = geo.status === "granted"
  const list = useMemo<Item[] | undefined>(() => {
    if (!stations) return undefined
    if (geo.status === "granted") return nearest(stations, geo.coords, LIMIT)
    return [...stations].sort((a, b) => (b.lastReadingAt ?? "").localeCompare(a.lastReadingAt ?? "")).slice(0, LIMIT)
  }, [stations, geo])

  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect).on("reInit", onSelect)
    return () => {
      api.off("select", onSelect).off("reInit", onSelect)
    }
  }, [api])
  // Ao trocar a ordem (localização obtida), volta para a primeira.
  useEffect(() => {
    api?.scrollTo(0, true)
  }, [api, located])

  // Avanço automático: AUTOPLAY_MS em cada estação (o timer reinicia a cada troca, inclusive manual).
  // Pausa com o ponteiro em cima ou foco dentro do carrossel, com a aba oculta e com reduced-motion.
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!api || paused || (list?.length ?? 0) < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setTimeout(() => {
      if (!document.hidden) api.scrollNext()
    }, AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [api, paused, current, list?.length])

  return (
    <section aria-labelledby="carousel-title" className={cn("flex w-full min-w-0 flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="carousel-title" className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4 text-primary" aria-hidden />
          {located ? "Estações perto de você" : "Estações atualizadas agora"}
        </h2>
        <LocationButton geo={geo} onRetry={onRetry} />
      </div>

      {!list ? (
        <Skeleton className="h-[18rem] w-full rounded-xl" />
      ) : list.length === 0 ? (
        <Empty className="h-[18rem] border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinned />
            </EmptyMedia>
            <EmptyTitle>Ainda não há estações públicas</EmptyTitle>
            <EmptyDescription>Os produtores escolhem quais estações aparecem aqui.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: list.length > 1 }}
          aria-label="Estações públicas"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
          }}
        >
          <CarouselContent className="py-1">
            {list.map((s, i) => (
              <CarouselItem key={s.id} className={cn(list.length > 1 && "basis-[90%] sm:basis-[75%] md:basis-[92%]")} aria-label={`${i + 1} de ${list.length}`}>
                <StationSlide station={s} rank={i} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {list.length > 1 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-1 items-center gap-1.5" role="tablist" aria-label="Escolher estação">
                {list.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === current}
                    aria-label={`Ir para ${s.name}`}
                    onClick={() => api?.scrollTo(i)}
                    className={cn("h-1.5 rounded-full transition-all", i === current ? "w-6 bg-primary" : "w-1.5 bg-foreground/20 hover:bg-foreground/40")}
                  />
                ))}
              </div>
              <CarouselPrevious aria-label="Estação anterior" className="static translate-y-0" />
              <CarouselNext aria-label="Próxima estação" className="static translate-y-0" />
            </div>
          )}
        </Carousel>
      )}

    </section>
  )
}
