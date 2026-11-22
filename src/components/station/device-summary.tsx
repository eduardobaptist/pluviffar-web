import { BatteryMedium, Clock, Radio, Wifi } from "lucide-react"
import type { ReactNode } from "react"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusDot } from "@/components/common/status-badges"
import type { StationOverview } from "@/lib/api/types"
import { fmtDateTime, fmtNumber, fmtRelative, freshness } from "@/lib/format"

function Tile({ icon, title, value, hint }: { icon: ReactNode; title: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Item variant="outline" className="bg-card shadow-card">
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemDescription>{title}</ItemDescription>
        <ItemTitle className="tabular-nums">{value}</ItemTitle>
        {hint && <ItemDescription className="text-xs">{hint}</ItemDescription>}
      </ItemContent>
    </Item>
  )
}

/** Última leitura e último status — sensor (pluviômetro) e gateway lado a lado. */
export function DeviceSummary({ overview, sendIntervalS }: { overview: StationOverview | undefined; sendIntervalS?: number | null }) {
  if (!overview)
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  const r = overview.lastReading
  const s = overview.lastStatus
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        icon={<Clock />}
        title="Última leitura"
        value={
          <span className="flex items-center gap-2">
            <StatusDot state={freshness(r?.measuredAt, sendIntervalS)} />
            {r ? fmtRelative(r.measuredAt) : "Nunca enviou dados"}
          </span>
        }
        hint={r ? fmtDateTime(r.measuredAt) : undefined}
      />
      <Tile
        icon={<BatteryMedium />}
        title="Bateria"
        value={s ? `${fmtNumber(s.batteryPct, "%")} · ${fmtNumber(s.batteryV, " V")}` : "—"}
        hint={s ? `status ${fmtRelative(s.measuredAt)}` : "sem status"}
      />
      <Tile icon={<Wifi />} title="Wi-Fi do gateway" value={s ? fmtNumber(s.rssiGatewayDbm, " dBm") : "—"} hint="RSSI" />
      <Tile icon={<Radio />} title="Sinal da estação (ESP-NOW)" value={s ? fmtNumber(s.rssiStationDbm, " dBm") : "—"} hint="medido no gateway" />
    </div>
  )
}
