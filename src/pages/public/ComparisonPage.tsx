import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { Comparison } from "@/components/station/comparison"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi } from "@/lib/api/endpoints"

export function PublicComparisonPage() {
  const q = useFetch(() => publicApi.list(), [], { intervalMs: 5 * 60_000 })
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader title="Comparativo" description="Compare a chuva registrada entre estações públicas." />
      {q.error ? <QueryError error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton className="h-96" /> : <Comparison stations={q.data} mode="public" />}
    </div>
  )
}
