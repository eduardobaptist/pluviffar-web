import { Info } from "lucide-react"
import { useSearchParams } from "react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
      <PageHeader title="Exportar dados" description="Baixe a chuva, as leituras brutas ou o status de uma ou várias estações em CSV ou Excel (XLSX)." />
      <Alert>
        <Info />
        <AlertDescription>
          O arquivo é gerado no seu navegador a partir da API. Leituras e status são buscados página a página (até 93 dias por requisição), então períodos longos
          podem levar alguns segundos. Intervalos sem leitura saem como <strong>SEM_DADOS</strong> — nunca como chuva zero.
        </AlertDescription>
      </Alert>
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
