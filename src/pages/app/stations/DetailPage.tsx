import { Link, useNavigate, useParams } from "react-router"
import { ChevronLeft, SearchX } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { StationActions } from "@/components/station/station-actions"
import { STATION_TABS, StationTabs } from "@/components/station/station-tabs"
import { isApiError } from "@/lib/api/client"
import { stationsApi } from "@/lib/api/endpoints"
import { useZodSearch } from "@/hooks/use-zod-search"
import { useFetch } from "@/hooks/use-fetch"

const searchSchema = z.object({ tab: z.enum(STATION_TABS).catch("chuva").default("chuva") })

export function StationDetailPage() {
  const id = useParams().id!
  const [{ tab }, setSearch] = useZodSearch(searchSchema)
  const navigate = useNavigate()
  const st = useFetch(() => stationsApi.get(id), [id])
  const ov = useFetch(st.data ? (signal) => stationsApi.overview(id, undefined, signal) : null, [id], { intervalMs: 60_000 })
  const s = st.data

  if (st.error && isApiError(st.error, "STATION_NOT_FOUND"))
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>Estação não encontrada</EmptyTitle>
          <EmptyDescription>Ela não existe, foi excluída ou pertence a outro produtor.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to="/minhas-estacoes">Voltar às estações</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  if (st.error) return <QueryError error={st.error} onRetry={st.reload} />

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/minhas-estacoes">
          <ChevronLeft data-icon="inline-start" /> Estações
        </Link>
      </Button>
      <PageHeader
        title={s?.name ?? <Skeleton className="h-9 w-64" />}
        actions={
          s && <StationActions station={s} onDeleted={() => navigate("/minhas-estacoes")} />
        }
      />

      {s ? (
        <StationTabs station={s} overview={ov.data} tab={tab} onTabChange={(t) => setSearch({ tab: t }, { replace: true })} />
      ) : (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-96 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}
    </>
  )
}
