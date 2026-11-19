import { Link } from "react-router"
import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { QueryError } from "@/components/common/query-error"
import { StationMap, type MapPoint } from "@/components/station/station-map"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi } from "@/lib/api/endpoints"
import { fmt24h, fmtRelative } from "@/lib/format"

export function MapPage() {
  const q = useFetch(() => publicApi.list(), [], { intervalMs: 5 * 60_000 })
  const [term, setTerm] = useState("")
  const filtered = useMemo(() => (q.data ?? []).filter((s) => s.name.toLowerCase().includes(term.toLowerCase())), [q.data, term])
  const points = useMemo<MapPoint[]>(
    () => filtered.map((s) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude, info: [`24 h: ${fmt24h(s.last24hMm, s.lastReadingAt)}`], href: "public" })),
    [filtered],
  )
  if (q.error) return <div className="p-4"><QueryError error={q.error} onRetry={q.reload} /></div>
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-3">
        <InputGroup>
          <InputGroupInput placeholder="Filtrar por nome" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Filtrar estações" />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <ScrollArea className="lg:h-[calc(100svh-11rem)]">
          <ItemGroup className="gap-2">
            {!q.data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
            {!!q.data && filtered.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma estação encontrada.</p>}
            {filtered.map((s) => (
              <Item key={s.id} variant="outline" size="sm" asChild>
                <Link to={`/estacoes/${s.id}`}>
                  <ItemContent>
                    <ItemTitle>{s.name}</ItemTitle>
                    <ItemDescription>
                      24 h: {fmt24h(s.last24hMm, s.lastReadingAt)} · atualizado {fmtRelative(s.lastReadingAt)}
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            ))}
          </ItemGroup>
        </ScrollArea>
      </div>
      {!q.data ? <Skeleton className="h-[75svh] rounded-xl" /> : <StationMap points={points} className="h-[75svh] lg:h-[calc(100svh-8rem)]" />}
    </div>
  )
}
