import { Link } from "react-router"
import { ArrowRight, ChevronDown, CloudRain, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { StatusDot } from "@/components/common/status-badges"
import { DeviceSummary } from "@/components/station/device-summary"
import { RainTotals, useTotalsCoverage } from "@/components/station/rain-totals"
import { SeriesPanel } from "@/components/station/series-panel"
import { stationsApi } from "@/lib/api/endpoints"
import type { Station } from "@/lib/api/types"
import { fmtRelative, freshness } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useZodSearch } from "@/hooks/use-zod-search"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

const searchSchema = z.object({ station: z.string().optional().catch(undefined) })

function FavoriteButton({ station, pending, onToggle }: { station: Station; pending: boolean; onToggle: () => void }) {
  const label = station.favorite ? "Desmarcar como favorita" : "Marcar como favorita"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="size-10" onClick={onToggle} disabled={pending} aria-label={label} aria-pressed={station.favorite}>
          <Star className={cn("size-6", station.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{station.favorite ? "Favorita — o painel abre nesta estação. Clique para desmarcar." : label}</TooltipContent>
    </Tooltip>
  )
}

function StationOverview({ station }: { station: Station }) {
  const [open, setOpen] = useState(false)
  const ov = useFetch((signal) => stationsApi.overview(station.id, undefined, signal), [station.id], { intervalMs: 60_000 })
  const coverage = useTotalsCoverage(station.id, station.sendIntervalS)
  const last = ov.data?.lastReading?.measuredAt
  return (
    <div className="flex flex-col gap-4">
      <RainTotals
        totals={ov.data?.precipitation}
        coverage={coverage}
        neverReported={ov.data ? !ov.data.lastReading : false}
        windows={["today", "last7d", "last30d"]}
        featured
      />
      <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between sm:w-fit">
            <span className="flex min-w-0 items-center gap-2">
              {ov.data && <StatusDot state={freshness(last, station.sendIntervalS)} />}
              Mais informações
              {ov.data && (
                <span className="truncate font-normal text-muted-foreground">· {last ? `última leitura ${fmtRelative(last)}` : "nunca enviou"}</span>
              )}
            </span>
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} data-icon="inline-end" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <DeviceSummary overview={ov.data} sendIntervalS={station.sendIntervalS} />
        </CollapsibleContent>
      </Collapsible>
      <SeriesPanel
        key={station.id}
        stationId={station.id}
        mode="private"
        sendIntervalS={station.sendIntervalS}
        initial="7"
        chartClassName="h-[clamp(18rem,45svh,30rem)]"
      />
    </div>
  )
}

/** Painel do produtor: abre na estação favorita (ou na escolhida no seletor), com totais e série em destaque. */
export function ProducerDashboard() {
  const me = useMe()
  const [{ station: selectedId }, setSearch] = useZodSearch(searchSchema)
  const stations = useFetch((signal) => stationsApi.listAll({ sort: "name,asc" }, signal), [])
  const [pending, setPending] = useState(false)
  const list = stations.data ?? []
  const selected = list.find((s) => s.id === selectedId) ?? list.find((s) => s.favorite) ?? list[0]

  async function toggleFavorite(st: Station) {
    const next = !st.favorite
    setPending(true)
    try {
      await (next ? stationsApi.markFavorite(st.id) : stationsApi.unmarkFavorite(st.id))
      // Uma favorita por usuário: marcar substitui a anterior.
      stations.setData(list.map((s) => (s.id === st.id ? { ...s, favorite: next } : next ? { ...s, favorite: false } : s)))
      // Fixa a seleção para a tela não pular de estação ao desmarcar.
      setSearch({ station: st.id }, { replace: true })
      toast.success(next ? `“${st.name}” é sua estação favorita.` : "Estação desmarcada como favorita.")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  if (stations.error) return <QueryError error={stations.error} onRetry={stations.reload} />

  return (
    <>
      <PageHeader
        title={`Olá, ${me.name.split(" ")[0]}`}
        description="Acompanhe a chuva e o estado dos seus equipamentos."
        actions={
          list.length > 1 && (
            <Select value={selected?.id} onValueChange={(v) => setSearch({ station: v }, { replace: true })}>
              <SelectTrigger className="w-full sm:w-72" aria-label="Estação">
                <SelectValue placeholder="Escolha a estação" />
              </SelectTrigger>
              <SelectContent>
                {list.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="truncate">{s.name}</span>
                    {s.favorite && <Star className="fill-warning text-warning" aria-label="favorita" />}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {!stations.data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : !selected ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudRain />
            </EmptyMedia>
            <EmptyTitle>Comece cadastrando seus equipamentos</EmptyTitle>
            <EmptyDescription>1. Cadastre o gateway (chip ID do tópico MQTT). 2. Cadastre os pluviômetros vinculados a ele. Os dados aparecem assim que chegarem pacotes.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">
            <Button asChild>
              <Link to="/gateways/novo">Cadastrar gateway</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/minhas-estacoes/novo">Cadastrar estação</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="-mb-2 flex flex-wrap items-center justify-between gap-x-3">
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate text-xl font-semibold">{selected.name}</h2>
              <FavoriteButton station={selected} pending={pending} onToggle={() => void toggleFavorite(selected)} />
            </div>
            <Button asChild variant="link" className="px-0">
              <Link to={`/minhas-estacoes/${selected.id}`}>
                Detalhes da estação <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <StationOverview key={selected.id} station={selected} />
        </>
      )}
    </>
  )
}
