import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { OwnerSelect } from "@/components/common/owner-select"
import type { CreateGatewayRequest, Gateway } from "@/lib/api/types"
import { gatewaySchema } from "@/lib/schemas"
import type { z } from "zod"
import { applyApiErrors } from "./api-errors"
import { FormField } from "./form-field"
import { FormRootError } from "./form-root-error"

type Values = z.infer<typeof gatewaySchema>
const FIELDS = ["hardwareId", "name", "description", "ownerId"] as const

/** Cadastro/edição de gateway. ADMIN escolhe/transfere o produtor dono. */
export function GatewayForm({
  gateway,
  isAdmin,
  onSubmit,
  onCancel,
}: {
  gateway?: Gateway
  isAdmin: boolean
  onSubmit: (body: CreateGatewayRequest) => Promise<unknown>
  onCancel: () => void
}) {
  const form = useForm<Values>({
    resolver: zodResolver(
      isAdmin && !gateway ? gatewaySchema.refine((v) => v.ownerId !== "", { path: ["ownerId"], message: "Escolha o produtor dono." }) : gatewaySchema,
    ),
    defaultValues: {
      hardwareId: gateway?.hardwareId ?? "",
      name: gateway?.name ?? "",
      description: gateway?.description ?? "",
      ownerId: gateway?.owner.id ?? "",
    },
  })

  async function submit(v: Values) {
    try {
      await onSubmit({
        hardwareId: v.hardwareId,
        name: v.name,
        ...(v.description ? { description: v.description } : {}),
        // PRODUCER deve omitir ownerId; ADMIN só envia na edição se mudou.
        ...(isAdmin && v.ownerId && v.ownerId !== gateway?.owner.id ? { ownerId: v.ownerId } : {}),
      })
    } catch (e) {
      applyApiErrors(e, form.setError, FIELDS, {
        HARDWARE_ID_ALREADY_REGISTERED: "hardwareId",
        OWNER_REQUIRED: "ownerId",
        INVALID_OWNER: "ownerId",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{gateway ? "Dados do gateway" : "Novo gateway"}</CardTitle>
          <CardDescription>ESP8266 que recebe dos pluviômetros (ESP-NOW) e publica no broker MQTT.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="hardwareId"
                label="Chip ID do gateway"
                description={gateway ? "Imutável. Para trocar o equipamento, exclua e cadastre outro." : "Segmento do tópico pluviffar/{chip-id}/… (minúsculas, números e hífen)."}
              >
                {(f) => <Input {...f} disabled={!!gateway} className="font-mono" placeholder="ex.: gw-fw01" autoComplete="off" />}
              </FormField>
              <FormField control={form.control} name="name" label="Nome">
                {(f) => <Input {...f} placeholder="ex.: Galpão sede" />}
              </FormField>
            </div>
            <FormField control={form.control} name="description" label="Descrição" description="Opcional. Até 1000 caracteres.">
              {(f) => <Textarea {...f} rows={3} />}
            </FormField>
            {isAdmin && (
              <FormField
                control={form.control}
                name="ownerId"
                label="Produtor dono"
                description={gateway ? "Trocar o dono transfere o gateway e todas as estações dele." : "Produtor ativo responsável pelo gateway."}
              >
                {({ value, onChange, id, "aria-invalid": invalid }) => <OwnerSelect id={id} value={value} onChange={onChange} invalid={invalid} />}
              </FormField>
            )}
            <FormRootError errors={form.formState.errors} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {gateway ? "Salvar alterações" : "Cadastrar gateway"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
