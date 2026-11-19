import { useSearchParams } from "react-router"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { ExportForm } from "@/components/station/export-form"
import { stationsApi } from "@/lib/api/endpoints"
import { useFetch } from "@/hooks/use-fetch"

export function ExportPage() {
  // `?station=a&station=b` pré-seleciona estações (link "Exportar" da lista).
  const [sp] = useSearchParams()
  const station = sp.getAll("station")
  const q = useFetch(() => stationsApi.list({ size: 100, sort: "name,asc" }), [])
  return (
    <>
      <PageHeader title="Exportar dados" description="CSV ou Excel de uma ou várias estações." />
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <Card>
          <CardContent>
            {!q.data ? (
              <Skeleton className="h-96" />
            ) : (
              <ExportForm
                stations={q.data.content.map((s) => ({ id: s.id, name: s.name, hardwareId: s.hardwareId, sendIntervalS: s.sendIntervalS ?? null }))}
                {...(station.length ? { defaultStationIds: station } : {})}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
