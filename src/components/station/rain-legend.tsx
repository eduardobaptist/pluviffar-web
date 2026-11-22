import { RAIN_LEVEL_CLASS, RAIN_NO_DATA_CLASS, rainLegend } from "@/lib/rain-calendar"
import { cn } from "@/lib/utils"

function Swatch({ className, round }: { className: string; round?: boolean }) {
  return <span aria-hidden className={cn("inline-block size-3.5 shrink-0", round ? "rounded-full" : "rounded-sm", className)} />
}

/** Legenda da escala de chuva (mesmas faixas do calendário pluviométrico e do mapa). */
export function RainLegend({ title, round, className }: { title: string; round?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      <span className="font-medium text-foreground">{title}</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {rainLegend().map((l) => (
          <span key={l.level} className="flex items-center gap-1 tabular-nums">
            <Swatch round={round} className={RAIN_LEVEL_CLASS[l.level]} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Swatch round={round} className={RAIN_NO_DATA_CLASS} />
          Sem dados
        </span>
      </span>
    </div>
  )
}
