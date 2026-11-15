import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { Comparison } from "@/components/station/comparison"
import { stationsApi } from "@/lib/api/endpoints"
import { useFetch } from "@/hooks/use-fetch"

export function AppComparisonPage() {
  const q = useFetch(() => stationsApi.list({ size: 100, sort: "name,asc" }), [])
  return (
    <>
      <PageHeader title="Comparativo" description="Compare a chuva e a cobertura entre suas estações." />
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : !q.data ? (
        <Skeleton className="h-96" />
      ) : (
        <Comparison stations={q.data.content.map((s) => ({ id: s.id, name: s.name, sendIntervalS: s.sendIntervalS ?? null }))} mode="private" />
      )}
    </>
  )
}
