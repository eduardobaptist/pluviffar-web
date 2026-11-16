import { useState } from "react"
import { fmtMm, fmtPct } from "@/lib/format"
import { bucketLabel, type SeriesRow } from "@/lib/period"
import { groupDaysByMonth, rainLegend, rainLevel, type MonthTotal, type RainLevel } from "@/lib/rain-calendar"
import { cn } from "@/lib/utils"

// Classes estáticas (o Tailwind precisa enxergar os nomes completos).
const LEVEL_CLASS: Record<RainLevel, string> = {
  0: "border border-border bg-card text-foreground",
  1: "bg-rain-1 text-rain-1-foreground",
  2: "bg-rain-2 text-rain-2-foreground",
  3: "bg-rain-3 text-rain-3-foreground",
  4: "bg-rain-4 text-rain-4-foreground",
  5: "bg-rain-5 text-rain-5-foreground",
  6: "bg-rain-6 text-rain-6-foreground",
}
const NO_DATA_CLASS =
  "border border-dashed border-muted-foreground/40 text-muted-foreground bg-[repeating-linear-gradient(135deg,var(--muted)_0_3px,transparent_3px_6px)]"

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"]

const dayLabel = (row: SeriesRow) => bucketLabel(row.start, "DAY", undefined, true)

function describe(row: SeriesRow): string {
  const parts = [dayLabel(row), fmtMm(row.mm), `${row.readings} leituras`]
  if (row.coverage != null) parts.push(`cobertura ${fmtPct(row.coverage)}`)
  return parts.join(" · ")
}

/**
 * Calendário pluviométrico: recebe a série **diária** e mostra um bloco por mês (dom–sáb),
 * com cada dia colorido pela faixa de chuva.
 */
export function RainCalendar({ rows }: { rows: SeriesRow[] }) {
  const [activeAt, setActiveAt] = useState<number | null>(null)
  const active = rows.find((r) => r.start.getTime() === activeAt) ?? null
  const hasCoverage = rows.some((r) => r.coverage != null)
  const months = groupDaysByMonth(rows)

  return (
    <div className="flex flex-col gap-4">
      <Legend hasCoverage={hasCoverage} />
      <div className="sticky top-14 z-[5] rounded-lg border bg-card/95 px-3 py-2 text-sm shadow-card backdrop-blur" aria-live="polite">
        {active ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-medium">{dayLabel(active)}</span>
            <span className="font-semibold tabular-nums">{fmtMm(active.mm)}</span>
            <span className="text-muted-foreground tabular-nums">{active.readings} leituras</span>
            {hasCoverage && <span className="text-muted-foreground tabular-nums">cobertura {fmtPct(active.coverage)}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">Passe o mouse (ou toque) num dia para ver os detalhes.</span>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-6 gap-y-5">
        {months.map((m) => (
          <section key={m.key} className="flex flex-col gap-1.5">
            <header className="flex items-baseline justify-between gap-2 text-sm">
              <h3 className="font-medium first-letter:uppercase">{m.label}</h3>
              <Total total={m.total} />
            </header>
            <div className="grid grid-cols-7 gap-1 text-[0.7rem]">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="text-center text-muted-foreground">
                  {w}
                </div>
              ))}
              {Array.from({ length: m.offset }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {m.days.map((row, i) =>
                row ? (
                  <DayCell key={i} day={i + 1} row={row} active={activeAt === row.start.getTime()} onActivate={() => setActiveAt(row.start.getTime())} />
                ) : (
                  // Dia fora do período consultado.
                  <div key={i} aria-hidden className="flex aspect-square items-center justify-center text-muted-foreground/40">
                    {i + 1}
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function DayCell({ day, row, active, onActivate }: { day: number; row: SeriesRow; active: boolean; onActivate: () => void }) {
  const level = rainLevel(row.mm)
  const lowCoverage = row.mm != null && row.coverage != null && row.coverage < 95
  return (
    <button
      type="button"
      aria-label={describe(row)}
      title={describe(row)}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-sm tabular-nums outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
        level == null ? NO_DATA_CLASS : LEVEL_CLASS[level],
        active && "ring-2 ring-foreground",
      )}
    >
      {day}
      {lowCoverage && (
        <span
          aria-hidden
          className={cn("absolute top-0.5 right-0.5 size-1.5 rounded-full ring-1 ring-background", row.coverage! >= 70 ? "bg-warning" : "bg-destructive")}
        />
      )}
    </button>
  )
}

function Total({ total }: { total: MonthTotal }) {
  const note = total.partial
    ? total.missing > 0
      ? `Total parcial: ${total.missing} ${total.missing === 1 ? "dia" : "dias"} sem dados`
      : "Total parcial: parte do mês está fora do período consultado"
    : undefined
  return (
    <span className={cn("text-xs tabular-nums", total.mm == null && "text-muted-foreground")} title={note}>
      {fmtMm(total.mm)}
      {total.partial && total.mm != null && <span className="text-muted-foreground">*</span>}
    </span>
  )
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block size-3.5 shrink-0 rounded-sm", className)} />
}

function Legend({ hasCoverage }: { hasCoverage: boolean }) {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-medium text-foreground">Chuva no dia (mm)</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {rainLegend().map((l) => (
            <span key={l.level} className="flex items-center gap-1 tabular-nums">
              <Swatch className={LEVEL_CLASS[l.level]} />
              {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <Swatch className={NO_DATA_CLASS} />
            Sem dados
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {hasCoverage && (
          <>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-warning" /> cobertura parcial (70–95%)
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-destructive" /> cobertura baixa (&lt; 70%)
            </span>
          </>
        )}
        <span>* total parcial do mês (dias sem dados ou fora do período)</span>
      </div>
    </div>
  )
}
