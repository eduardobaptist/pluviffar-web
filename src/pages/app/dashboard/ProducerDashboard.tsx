import { Link } from "react-router"
import { CloudRain, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { StationActions } from "@/components/station/station-actions"
import { STATION_TABS, StationTabs, type StationTab } from "@/components/station/station-tabs"
import { stationsApi } from "@/lib/api/endpoints"
import type { Station } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { useZodSearch } from "@/hooks/use-zod-search"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

const searchSchema = z.object({
  station: z.string().optional().catch(undefined),
  tab: z.enum(STATION_TABS).catch("chuva").default("chuva"),
})

function FavoriteButton({ station, pending, onToggle }: { station: Station; pending: boolean; onToggle: () => void }) {
  const label = station.favorite ? "Desmarcar como favorita" : "Marcar como favorita. A estação aparecerá selecionada nessa tela ao entrar."
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="size-10" onClick={onToggle} disabled={pending} aria-label={label} aria-pressed={station.favorite}>
          <Star className={cn("size-6", station.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Estação selecionada: as mesmas abas do detalhe. */
function StationOverview({ station, tab, onTabChange }: { station: Station; tab: StationTab; onTabChange: (t: StationTab) => void }) {
  const ov = useFetch((signal) => stationsApi.overview(station.id, undefined, signal), [station.id], { intervalMs: 60_000 })
  return <StationTabs station={station} overview={ov.data} tab={tab} onTabChange={onTabChange} />
}

/** Painel do produtor: abre na estação favorita (ou na escolhida no seletor), com as mesmas abas do detalhe da estação. */
export function ProducerDashboard() {
  const me = useMe()
  const [{ station: selectedId, tab }, setSearch] = useZodSearch(searchSchema)
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
          <div className="-mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate text-xl font-semibold">{selected.name}</h2>
              <FavoriteButton station={selected} pending={pending} onToggle={() => void toggleFavorite(selected)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StationActions
                station={selected}
                onDeleted={() => {
                  stations.setData(list.filter((s) => s.id !== selected.id))
                  setSearch({ station: undefined }, { replace: true })
                }}
              />
            </div>
          </div>
          <StationOverview key={selected.id} station={selected} tab={tab} onTabChange={(t) => setSearch({ station: selected.id, tab: t }, { replace: true })} />
        </>
      )}
    </>
  )
}
