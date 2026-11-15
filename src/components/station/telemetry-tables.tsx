import { subHours } from "date-fns"
import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DataPagination } from "@/components/common/data-pagination"
import { QueryError } from "@/components/common/query-error"
import { useFetch } from "@/hooks/use-fetch"
import { stationsApi } from "@/lib/api/endpoints"
import { fmtDateTime, fmtMm, fmtNumber, fmtUptime } from "@/lib/format"

const WINDOWS = [
  { value: "24", label: "24 h" },
  { value: "72", label: "3 dias" },
  { value: "168", label: "7 dias" },
  { value: "720", label: "30 dias" },
  { value: "2232", label: "93 dias" },
]

function useWindow() {
  const [hours, setHours] = useState("24")
  const [page, setPage] = useState(0)
  const period = useMemo(() => {
    const to = new Date(Math.floor(Date.now() / 60_000) * 60_000)
    return { from: subHours(to, Number(hours)).toISOString(), to: to.toISOString() }
  }, [hours])
  const picker = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={hours}
      onValueChange={(v) => {
        if (v) {
          setHours(v)
          setPage(0)
        }
      }}
    >
      {WINDOWS.map((w) => (
        <ToggleGroupItem key={w.value} value={w.value}>
          {w.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
  return { period, page, setPage, picker }
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <TableRow key={i}>
          <TableCell colSpan={cols}>
            <Skeleton className="h-5" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  )
}

/** Leituras brutas (tópico dados), mais recentes primeiro. Lacunas de seq = pacotes perdidos. */
export function ReadingsTable({ stationId }: { stationId: string }) {
  const { period, page, setPage, picker } = useWindow()
  const q = useFetch((signal) => stationsApi.readings(stationId, { ...period, page, size: 50 }, signal), [stationId, period, page], { keepPrevious: true })
  const rows = q.data?.content ?? []
  return (
    <div className="flex flex-col gap-4">
      {picker}
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <Card className={q.loading ? "py-0 opacity-70" : "py-0"}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medido em</TableHead>
                <TableHead>Recebido em</TableHead>
                <TableHead className="text-right">Chuva</TableHead>
                <TableHead className="text-right">Basc./min</TableHead>
                <TableHead className="text-right">Seq</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!q.data && <LoadingRows cols={5} />}
              {q.data && rows.length === 0 && <EmptyRow cols={5} text="Nenhuma leitura no período — sem dado não significa chuva zero." />}
              {rows.map((r, i) => {
                const older = rows[i + 1]
                const lost = older && r.seq > older.seq ? r.seq - older.seq - 1 : 0
                return (
                  <TableRow key={`${r.measuredAt}-${r.seq}`}>
                    <TableCell>{fmtDateTime(r.measuredAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDateTime(r.receivedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMm(r.precipitationMm)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.tipsPerMinute}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {r.seq}
                      {lost > 0 && <span className="ml-1 text-warning-foreground" title={`${lost} pacote(s) perdido(s) antes desta leitura`}>(−{lost})</span>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      {q.data && <DataPagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onPageChange={setPage} />}
    </div>
  )
}

/** Status do dispositivo (tópico status): bateria, RSSI e uptime. */
export function StatusTable({ stationId }: { stationId: string }) {
  const { period, page, setPage, picker } = useWindow()
  const q = useFetch((signal) => stationsApi.status(stationId, { ...period, page, size: 50 }, signal), [stationId, period, page], { keepPrevious: true })
  return (
    <div className="flex flex-col gap-4">
      {picker}
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <Card className={q.loading ? "py-0 opacity-70" : "py-0"}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medido em</TableHead>
                <TableHead className="text-right">Bateria</TableHead>
                <TableHead className="text-right">RSSI gateway</TableHead>
                <TableHead className="text-right">RSSI estação</TableHead>
                <TableHead className="text-right">Uptime gateway</TableHead>
                <TableHead className="text-right">Uptime estação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!q.data && <LoadingRows cols={6} />}
              {q.data?.content.length === 0 && <EmptyRow cols={6} text="Nenhum status recebido no período." />}
              {q.data?.content.map((s) => (
                <TableRow key={s.measuredAt}>
                  <TableCell>{fmtDateTime(s.measuredAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNumber(s.batteryPct, "%")} · {fmtNumber(s.batteryV, " V")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNumber(s.rssiGatewayDbm, " dBm")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNumber(s.rssiStationDbm, " dBm")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtUptime(s.uptimeGatewayS)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtUptime(s.uptimeStationS)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {q.data && <DataPagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onPageChange={setPage} />}
    </div>
  )
}

/** Histórico de configuração reportada (tópico conf) — registrado só quando muda. */
export function ConfigReportsTable({ stationId }: { stationId: string }) {
  const [page, setPage] = useState(0)
  const q = useFetch(() => stationsApi.configReports(stationId, { page, size: 20 }), [stationId, page], { keepPrevious: true })
  return (
    <div className="flex flex-col gap-4">
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recebida em</TableHead>
                <TableHead>FW / HW gateway</TableHead>
                <TableHead>FW / HW estação</TableHead>
                <TableHead className="text-right">Intervalo</TableHead>
                <TableHead className="text-right">mm/basculada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!q.data && <LoadingRows cols={5} />}
              {q.data?.content.length === 0 && <EmptyRow cols={5} text="O dispositivo ainda não reportou configuração." />}
              {q.data?.content.map((c) => (
                <TableRow key={c.reportedAt}>
                  <TableCell>{fmtDateTime(c.reportedAt)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.fwGateway ?? "—"} / {c.hwGateway ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.fwStation ?? "—"} / {c.hwStation ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNumber(c.sendIntervalS, " s")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNumber(c.mmPerTip)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {q.data && <DataPagination page={q.data.page} totalPages={q.data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
