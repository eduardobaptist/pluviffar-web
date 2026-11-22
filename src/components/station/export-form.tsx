import { zodResolver } from "@hookform/resolvers/zod"
import { subDays } from "date-fns"
import { Download, FileSpreadsheet, FileText, X } from "lucide-react"
import { useRef, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { FormField } from "@/components/form/form-field"
import { FormRootError } from "@/components/form/form-root-error"
import type { Bucket } from "@/lib/api/types"
import { runExport, type ExportStation, type Progress as P } from "@/lib/export"
import { BUCKET_LABEL, dayRange } from "@/lib/period"
import { DateRangePicker } from "./date-range-picker"

const schema = z
  .object({
    stationIds: z.array(z.string()).min(1, "Selecione ao menos uma estação."),
    raw: z.boolean(),
    bucket: z.enum(["HOUR", "DAY", "WEEK", "MONTH"]),
    range: z.object({ from: z.date().optional(), to: z.date().optional() }),
    format: z.enum(["csv", "xlsx"]),
  })
  .superRefine((v, ctx) => {
    if (!v.range.from) ctx.addIssue({ code: "custom", path: ["range"], message: "Escolha o período." })
  })

type Values = z.infer<typeof schema>

const FORMATS = [
  { value: "xlsx", label: "Excel (.xlsx)", desc: "Uma aba por estação.", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", desc: "Uma tabela com todas as estações.", icon: FileText },
] as const

/**
 * Exportação de chuva das estações (CSV/XLSX): agregados por hora/dia/semana/mês ou, com o switch
 * "Exportar cada leitura", um registro por pacote (desabilita o "Agrupar por").
 * Formulário em página/aba — nunca em dialog.
 * `publicMode`: endpoints públicos, sem colunas de cobertura; leituras indisponíveis (a API pública não as expõe).
 */
export function ExportForm({
  stations,
  defaultStationIds,
  publicMode = false,
  lockStations = false,
}: {
  stations: ExportStation[]
  defaultStationIds?: string[]
  publicMode?: boolean
  /** Exportação de uma estação só (página de detalhe) — esconde a seleção. */
  lockStations?: boolean
}) {
  const [progress, setProgress] = useState<P | null>(null)
  const abort = useRef<AbortController | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      stationIds: defaultStationIds ?? (stations.length === 1 ? [stations[0]!.id] : []),
      raw: false,
      bucket: "DAY",
      range: { from: subDays(new Date(), 29), to: new Date() },
      format: "xlsx",
    },
  })
  const raw = useWatch({ control: form.control, name: "raw" })

  async function onSubmit(v: Values) {
    const selected = stations.filter((s) => v.stationIds.includes(s.id))
    const ctrl = new AbortController()
    abort.current = ctrl
    setProgress({ done: 0, total: selected.length, label: "Iniciando…" })
    try {
      const { rows } = await runExport(
        {
          stations: selected,
          bucket: v.bucket,
          raw: v.raw && !publicMode,
          range: dayRange(v.range.from!, v.range.to ?? v.range.from!),
          format: v.format,
          publicMode,
        },
        ctrl.signal,
        setProgress,
      )
      toast.success(`Arquivo gerado com ${rows.toLocaleString("pt-BR")} linha(s).`)
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("Exportação cancelada.")
      else form.setError("root.server", { message: (e as Error).message })
    } finally {
      setProgress(null)
      abort.current = null
    }
  }

  const busy = progress != null

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-6">
      <FieldGroup>
        {!lockStations && (
          <Controller
            control={form.control}
            name="stationIds"
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid}>
                <FieldLegend variant="label">Estações</FieldLegend>
                <FieldDescription>
                  {field.value.length} de {stations.length} selecionada(s).{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => field.onChange(field.value.length ? [] : stations.map((s) => s.id))}
                  >
                    {field.value.length ? "Limpar" : "Selecionar todas"}
                  </button>
                </FieldDescription>
                <ScrollArea className="max-h-56 rounded-lg border">
                  <FieldGroup data-slot="checkbox-group" className="gap-3 p-3">
                    {stations.map((s) => (
                      <Field key={s.id} orientation="horizontal">
                        <Checkbox
                          id={`exp-st-${s.id}`}
                          checked={field.value.includes(s.id)}
                          onCheckedChange={(c) => field.onChange(c ? [...field.value, s.id] : field.value.filter((x) => x !== s.id))}
                        />
                        <FieldLabel htmlFor={`exp-st-${s.id}`} className="font-normal">
                          {s.name}
                          {s.hardwareId && <span className="font-mono text-xs text-muted-foreground">{s.hardwareId}</span>}
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </ScrollArea>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldSet>
            )}
          />
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField control={form.control} name="range" label="Período">
            {({ value, onChange, id, "aria-invalid": invalid }) => (
              <DateRangePicker id={id} value={value} onChange={onChange} invalid={invalid} className="w-full" />
            )}
          </FormField>
          <FormField control={form.control} name="bucket" label="Agrupar por">
            {({ value, onChange, id, "aria-invalid": invalid }) => (
              // "Exportar cada leitura" é o contraponto do agrupamento: ligado, desabilita o select.
              <div className="flex items-center gap-4">
                <Select value={value} onValueChange={onChange} disabled={raw}>
                  <SelectTrigger id={id} aria-invalid={invalid} className="min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
                      <SelectItem key={b} value={b}>
                        {BUCKET_LABEL[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Field orientation="horizontal" className="w-auto shrink-0" data-disabled={publicMode || undefined}>
                  <Switch
                    id="exp-raw"
                    checked={raw && !publicMode}
                    onCheckedChange={(c) => form.setValue("raw", c, { shouldValidate: true })}
                    disabled={publicMode}
                  />
                  <FieldLabel htmlFor="exp-raw" className="font-normal whitespace-nowrap">
                    Exportar cada leitura
                  </FieldLabel>
                </Field>
              </div>
            )}
          </FormField>
        </div>

        <Controller
          control={form.control}
          name="format"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Formato</FieldLegend>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <FieldLabel key={f.value} htmlFor={`exp-fmt-${f.value}`}>
                    <Field orientation="horizontal">
                      <f.icon className="mt-0.5 size-5 text-muted-foreground" />
                      <FieldContent>
                        <FieldTitle>{f.label}</FieldTitle>
                        <FieldDescription>{f.desc}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value={f.value} id={`exp-fmt-${f.value}`} />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>
          )}
        />
      </FieldGroup>

      <FormRootError errors={form.formState.errors} />

      {progress && (
        <div className="flex flex-col gap-2">
          <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
          <p className="text-sm text-muted-foreground">
            {progress.label} ({progress.done}/{progress.total})
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}
          {busy ? "Exportando…" : "Exportar"}
        </Button>
        {busy && (
          <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
            <X data-icon="inline-start" /> Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
