import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import type { Bucket } from "@/lib/api/types"
import { fmtMm, fmtPct } from "@/lib/format"
import { bucketLabel, type SeriesRow } from "@/lib/period"

const config = {
  mm: { label: "Chuva (mm)", color: "var(--rain)" },
  coverage: { label: "Cobertura (%)", color: "var(--chart-2)" },
  noData: { label: "Sem dados", color: "var(--muted-foreground)" },
} satisfies ChartConfig

interface Datum {
  label: string
  start: number
  mm: number | null
  coverage: number | null
  noData: number | null
  readings: number
}

/**
 * Barras de chuva por bucket + linha de cobertura (quando estimável).
 * Buckets sem leitura viram um traço cinza na base ("Sem dados") — nunca uma barra de 0 mm.
 */
export function PrecipitationChart({ rows, bucket, className }: { rows: SeriesRow[]; bucket: Bucket; className?: string }) {
  const hasCoverage = rows.some((r) => r.coverage != null)
  const data: Datum[] = rows.map((r) => ({
    label: r.label,
    start: r.start.getTime(),
    mm: r.mm,
    coverage: r.coverage == null ? null : Math.round(r.coverage),
    noData: r.mm == null ? 1 : null,
    readings: r.readings,
  }))
  return (
    <ChartContainer config={config} className={className ?? "aspect-auto h-72 w-full"}>
      <ComposedChart data={data} margin={{ top: 16, right: hasCoverage ? 0 : 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} tickMargin={8} />
        <YAxis yAxisId="mm" tickLine={false} axisLine={false} width={64} unit=" mm" allowDecimals />
        <YAxis yAxisId="nd" hide domain={[0, 40]} />
        {hasCoverage && <YAxis yAxisId="cov" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} width={40} unit="%" />}
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as Datum | undefined
            if (!active || !d) return null
            return (
              <div className="grid min-w-40 gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <div className="font-medium">{bucketLabel(new Date(d.start), bucket, undefined, true)}</div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Chuva</span>
                  <span className="font-mono font-medium">{fmtMm(d.mm)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Leituras</span>
                  <span className="font-mono">{d.readings}</span>
                </div>
                {hasCoverage && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Cobertura</span>
                    <span className="font-mono">{fmtPct(d.coverage)}</span>
                  </div>
                )}
              </div>
            )
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="mm" dataKey="mm" fill="var(--color-mm)" radius={[3, 3, 0, 0]} maxBarSize={36} />
        <Bar yAxisId="nd" dataKey="noData" fill="var(--color-noData)" fillOpacity={0.35} maxBarSize={36} legendType="square" />
        {hasCoverage && (
          <Line yAxisId="cov" dataKey="coverage" stroke="var(--color-coverage)" strokeWidth={1.5} dot={false} connectNulls={false} type="monotone" />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
