import { subDays } from "date-fns"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Bucket } from "@/lib/api/types"
import { BUCKET_LABEL, calendarDays, MAX_DAYS, suggestBucket } from "@/lib/period"
import { DateRangePicker } from "./date-range-picker"

export type Preset = "1" | "7" | "30" | "90" | "365" | "custom"

export interface PeriodState {
  preset: Preset
  fromDay: Date
  toDay: Date
  bucket: Bucket
}

export const PRESETS: { value: Preset; label: string }[] = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "365", label: "12 meses" },
  { value: "custom", label: "Personalizado" },
]

export function periodFromPreset(preset: Exclude<Preset, "custom">): PeriodState {
  const n = Number(preset)
  return { preset, fromDay: subDays(new Date(), n - 1), toDay: new Date(), bucket: suggestBucket(n) }
}

export function allowedBuckets(days: number): Bucket[] {
  return (["HOUR", "DAY", "WEEK", "MONTH"] as Bucket[]).filter((b) => days <= MAX_DAYS[b] && !(b === "HOUR" && days > 31))
}

/** Seletor de período (atalhos + intervalo personalizado) e granularidade da série. */
export function PeriodControls({ value, onChange }: { value: PeriodState; onChange: (v: PeriodState) => void }) {
  const days = calendarDays(value.fromDay, value.toDay)
  const buckets = allowedBuckets(days)
  return (
    <div className="flex flex-wrap items-end gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.preset}
        onValueChange={(v) => {
          if (!v) return
          if (v === "custom") onChange({ ...value, preset: "custom" })
          else onChange(periodFromPreset(v as Exclude<Preset, "custom">))
        }}
        className="flex-wrap"
      >
        {PRESETS.map((p) => (
          <ToggleGroupItem key={p.value} value={p.value}>
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {value.preset === "custom" && (
        <DateRangePicker
          value={{ from: value.fromDay, to: value.toDay }}
          onChange={(r) => {
            if (!r.from) return
            const to = r.to ?? r.from
            const d = calendarDays(r.from, to)
            const ok = allowedBuckets(d)
            onChange({ ...value, fromDay: r.from, toDay: to, bucket: ok.includes(value.bucket) ? value.bucket : suggestBucket(d) })
          }}
        />
      )}
      <Field orientation="horizontal" className="w-auto">
        <FieldLabel htmlFor="bucket" className="text-muted-foreground">
          Agrupar por
        </FieldLabel>
        <Select value={value.bucket} onValueChange={(b) => onChange({ ...value, bucket: b as Bucket })}>
          <SelectTrigger id="bucket" size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buckets.map((b) => (
              <SelectItem key={b} value={b}>
                {BUCKET_LABEL[b]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
