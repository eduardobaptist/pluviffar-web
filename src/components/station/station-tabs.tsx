import { Link } from "react-router"
import { Activity, ChevronDown, Cpu, Download, LineChart, List } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusDot } from "@/components/common/status-badges"
import type { Station, StationOverview } from "@/lib/api/types"
import { fmtDateTime, fmtNumber, fmtRelative, freshness, mm24h } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DeviceSummary } from "./device-summary"
import { ExportForm } from "./export-form"
import { RainTotals, useTotalsCoverage } from "./rain-totals"
import { SeriesPanel } from "./series-panel"
import { StationMap } from "./station-map"
import { ConfigReportsTable, ReadingsTable, StatusTable } from "./telemetry-tables"

export const STATION_TABS = ["chuva", "leituras", "status", "configuracao", "exportar"] as const
export type StationTab = (typeof STATION_TABS)[number]

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )
}

/** Aba Chuva: totais Hoje/7/30 dias em destaque, "Mais informações" (status do equipamento) recolhido e série com gráfico grande. */
function RainTab({ station, overview }: { station: Station; overview: StationOverview | undefined }) {
  const [open, setOpen] = useState(false)
  const coverage = useTotalsCoverage(station.id, station.sendIntervalS)
  const last = overview?.lastReading?.measuredAt
  return (
    <div className="flex flex-col gap-4">
      <RainTotals
        totals={overview?.precipitation}
        coverage={coverage}
        neverReported={overview ? !overview.lastReading : false}
        windows={["today", "last7d", "last30d"]}
        featured
      />
      <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between sm:w-fit">
            <span className="flex min-w-0 items-center gap-2">
              {overview && <StatusDot state={freshness(last, station.sendIntervalS)} />}
              Mais informações
              {overview && (
                <span className="truncate font-normal text-muted-foreground">· {last ? `última leitura ${fmtRelative(last)}` : "nunca enviou"}</span>
              )}
            </span>
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} data-icon="inline-end" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <DeviceSummary overview={overview} sendIntervalS={station.sendIntervalS} />
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

function ConfigTab({ station: s, overview }: { station: Station; overview: StationOverview | undefined }) {
  // Sem overview ainda → ponto neutro; depois, a cor da chuva de 24 h (null = sem dados).
  const mm = overview ? mm24h(overview.precipitation.last24hMm, overview.lastReading?.measuredAt) : undefined
  const points = useMemo(
    () => (s.latitude != null && s.longitude != null ? [{ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude, mm }] : []),
    [s.id, s.name, s.latitude, s.longitude, mm],
  )
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuração atual</CardTitle>
            <CardDescription>Reportada pelo dispositivo (tópico conf).</CardDescription>
          </CardHeader>
          <CardContent>
            <Row k="Firmware / hardware" v={<span className="font-mono text-xs">{s.fwVersion ?? "—"} / {s.hwVersion ?? "—"}</span>} />
            <Row k="Intervalo de envio" v={fmtNumber(s.sendIntervalS, " s")} />
            <Row k="mm por basculada" v={fmtNumber(s.mmPerTip)} />
            <Row k="Reportada em" v={fmtDateTime(s.configReportedAt)} />
            <Row k="Cadastrada em" v={fmtDateTime(s.createdAt)} />
            {s.description && <Row k="Descrição" v={s.description} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Localização</CardTitle>
            <CardDescription>{s.latitude != null ? `${s.latitude}, ${s.longitude}` : "Sem coordenadas cadastradas."}</CardDescription>
          </CardHeader>
          <CardContent>{points.length > 0 && <StationMap points={points} className="h-56" />}</CardContent>
        </Card>
      </div>
      <h2 className="text-lg font-semibold">Histórico de configuração</h2>
      <ConfigReportsTable stationId={s.id} />
    </div>
  )
}

/**
 * Conteúdo de uma estação (logado), igual no painel do produtor e no detalhe da estação:
 * abas Chuva / Leituras / Status / Configuração / Exportar.
 */
export function StationTabs({
  station,
  overview,
  tab,
  onTabChange,
}: {
  station: Station
  overview: StationOverview | undefined
  tab: StationTab
  onTabChange: (tab: StationTab) => void
}) {
  return (
    <Tabs value={tab} onValueChange={(t) => onTabChange(t as StationTab)}>
      <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none] sm:w-fit [&::-webkit-scrollbar]:hidden">
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

      <TabsContent value="chuva" className="pt-2">
        <RainTab station={station} overview={overview} />
      </TabsContent>
      <TabsContent value="leituras" className="pt-2">
        <ReadingsTable stationId={station.id} />
      </TabsContent>
      <TabsContent value="status" className="pt-2">
        <StatusTable stationId={station.id} />
      </TabsContent>
      <TabsContent value="configuracao" className="pt-2">
        <ConfigTab station={station} overview={overview} />
      </TabsContent>
      <TabsContent value="exportar" className="pt-2">
        <Card>
          <CardHeader>
            <CardTitle>Exportar dados desta estação</CardTitle>
            <CardDescription>
              Chuva acumulada por hora, dia, semana ou mês, em Excel ou CSV. Para várias estações de uma vez, use{" "}
              <Link to="/exportar" className="underline underline-offset-4">
                Exportar dados
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportForm
              stations={[{ id: station.id, name: station.name, hardwareId: station.hardwareId, sendIntervalS: station.sendIntervalS ?? null }]}
              lockStations
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
