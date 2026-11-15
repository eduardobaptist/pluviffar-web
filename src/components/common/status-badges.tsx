import { Badge } from "@/components/ui/badge"
import { fmtPct, fmtRelative, freshness, type Freshness } from "@/lib/format"
import { cn } from "@/lib/utils"

const FRESH: Record<Freshness, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-success" },
  late: { label: "Atrasada", dot: "bg-warning" },
  offline: { label: "Sem comunicação", dot: "bg-destructive" },
  never: { label: "Nunca enviou", dot: "bg-muted-foreground/40" },
}

export function StatusDot({ state, className }: { state: Freshness; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", FRESH[state].dot, className)} />
}

/** Atualidade do último dado recebido (online / atrasada / sem comunicação). */
export function FreshnessBadge({ at, sendIntervalS, showAge = false }: { at: string | null | undefined; sendIntervalS?: number | null; showAge?: boolean }) {
  const s = freshness(at, sendIntervalS)
  return (
    <Badge variant="outline" title={at ? new Date(at).toLocaleString("pt-BR") : undefined}>
      <StatusDot state={s} />
      {showAge && at ? fmtRelative(at) : FRESH[s].label}
    </Badge>
  )
}

/** Cobertura temporal: ≥ 95% boa, ≥ 70% parcial, abaixo disso baixa. null = não estimável. */
export function CoverageBadge({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null)
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)} title="Intervalo de envio da estação desconhecido — não é possível estimar a cobertura.">
        cobertura —
      </Badge>
    )
  const tone =
    value >= 95
      ? "border-success/40 bg-success/10 text-success-foreground"
      : value >= 70
        ? "border-warning/50 bg-warning/15 text-warning-foreground"
        : "border-destructive/40 bg-destructive/10 text-destructive"
  return (
    <Badge variant="outline" className={cn(tone, className)} title="Cobertura temporal: leituras recebidas ÷ esperadas">
      {fmtPct(value)}
    </Badge>
  )
}
