import { Link, useNavigate, useParams } from "react-router"
import { Activity, ChevronLeft, Cpu, Download, LineChart, List, Pencil, SearchX, Trash2 } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmAction } from "@/components/common/confirm-action"
import { PageHeader } from "@/components/common/page-header"
import { FreshnessBadge } from "@/components/common/status-badges"
import { QueryError } from "@/components/common/query-error"
import { DeviceSummary } from "@/components/station/device-summary"
import { ExportForm } from "@/components/station/export-form"
import { RainTotals, useTotalsCoverage } from "@/components/station/rain-totals"
import { SeriesPanel } from "@/components/station/series-panel"
import { StationMap } from "@/components/station/station-map"
import { ConfigReportsTable, ReadingsTable, StatusTable } from "@/components/station/telemetry-tables"
import { isApiError } from "@/lib/api/client"
import { stationsApi } from "@/lib/api/endpoints"
import { useZodSearch } from "@/hooks/use-zod-search"
import { fmtDateTime, fmtNumber } from "@/lib/format"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

const TABS = ["chuva", "leituras", "status", "configuracao", "exportar"] as const
type Tab = (typeof TABS)[number]

const searchSchema = z.object({ tab: z.enum(TABS).catch("chuva").default("chuva") })

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )
}

export function StationDetailPage() {
  const id = useParams().id!
  const [{ tab }, setSearch] = useZodSearch(searchSchema)
  const me = useMe()
  const navigate = useNavigate()
  const st = useFetch(() => stationsApi.get(id), [id])
  const ov = useFetch(st.data ? (signal) => stationsApi.overview(id, undefined, signal) : null, [id], { intervalMs: 60_000 })
  const s = st.data
  const coverage = useTotalsCoverage(id, s?.sendIntervalS)
  const points = useMemo(
    () => (s?.latitude != null && s.longitude != null ? [{ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude }] : []),
    [s],
  )

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
        description={
          s && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{s.hardwareId}</span>·<span>gateway {s.gateway.name}</span>
              {me.role === "ADMIN" && <>· <span>{s.owner.name}</span></>}
              {s.isPublic ? <Badge>Pública</Badge> : <Badge variant="secondary">Privada</Badge>}
              <FreshnessBadge at={ov.data?.lastReading?.measuredAt} sendIntervalS={s.sendIntervalS} />
            </span>
          )
        }
        actions={
          s && (
            <>
              <Button asChild variant="outline">
                <Link to={`/minhas-estacoes/${id}/editar`}>
                  <Pencil data-icon="inline-start" /> Editar
                </Link>
              </Button>
              <ConfirmAction
                title={`Excluir “${s.name}”?`}
                description="Exclusão lógica: as leituras são mantidas e o chip ID fica livre para novo cadastro. A estação sai da área pública."
                confirmLabel="Excluir"
                onConfirm={async () => {
                  try {
                    await stationsApi.remove(id)
                    toast.success("Estação excluída.")
                    await navigate("/minhas-estacoes")
                  } catch (e) {
                    toast.error((e as Error).message)
                    throw e
                  }
                }}
                trigger={
                  <Button variant="destructive">
                    <Trash2 data-icon="inline-start" /> Excluir
                  </Button>
                }
              />
            </>
          )
        }
      />

      <Tabs value={tab} onValueChange={(t) => setSearch({ tab: t as Tab }, { replace: true })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="chuva">
            <LineChart /> Chuva
          </TabsTrigger>
          <TabsTrigger value="leituras">
            <List /> Leituras
          </TabsTrigger>
          <TabsTrigger value="status">
            <Activity /> Status
          </TabsTrigger>
          <TabsTrigger value="configuracao">
            <Cpu /> Configuração
          </TabsTrigger>
          <TabsTrigger value="exportar">
            <Download /> Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chuva" className="flex flex-col gap-6 pt-2">
          <RainTotals totals={ov.data?.precipitation} coverage={coverage} neverReported={ov.data ? !ov.data.lastReading : false} />
          <DeviceSummary overview={ov.data} sendIntervalS={s?.sendIntervalS} />
          {s && <SeriesPanel stationId={id} mode="private" sendIntervalS={s.sendIntervalS} />}
        </TabsContent>

        <TabsContent value="leituras" className="pt-2">
          <ReadingsTable stationId={id} />
        </TabsContent>

        <TabsContent value="status" className="pt-2">
          <StatusTable stationId={id} />
        </TabsContent>

        <TabsContent value="configuracao" className="flex flex-col gap-6 pt-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configuração atual</CardTitle>
                <CardDescription>Reportada pelo dispositivo (tópico conf).</CardDescription>
              </CardHeader>
              <CardContent>
                {s ? (
                  <>
                    <Row k="Firmware / hardware" v={<span className="font-mono text-xs">{s.fwVersion ?? "—"} / {s.hwVersion ?? "—"}</span>} />
                    <Row k="Intervalo de envio" v={fmtNumber(s.sendIntervalS, " s")} />
                    <Row k="mm por basculada" v={fmtNumber(s.mmPerTip)} />
                    <Row k="Reportada em" v={fmtDateTime(s.configReportedAt)} />
                    <Row k="Cadastrada em" v={fmtDateTime(s.createdAt)} />
                    {s.description && <Row k="Descrição" v={s.description} />}
                  </>
                ) : (
                  <Skeleton className="h-40" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Localização</CardTitle>
                <CardDescription>
                  {s?.latitude != null ? `${s.latitude}, ${s.longitude}` : "Sem coordenadas cadastradas."}
                </CardDescription>
              </CardHeader>
              <CardContent>{points.length > 0 && <StationMap points={points} className="h-56" />}</CardContent>
            </Card>
          </div>
          <h2 className="text-lg font-semibold">Histórico de configuração</h2>
          <ConfigReportsTable stationId={id} />
        </TabsContent>

        <TabsContent value="exportar" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle>Exportar dados desta estação</CardTitle>
              <CardDescription>
                Série agregada, leituras brutas ou status, em CSV ou Excel. Para várias estações de uma vez, use{" "}
                <Link to="/exportar" className="underline underline-offset-4">
                  Exportar dados
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              {s && <ExportForm stations={[{ id: s.id, name: s.name, hardwareId: s.hardwareId, sendIntervalS: s.sendIntervalS ?? null }]} lockStations />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
