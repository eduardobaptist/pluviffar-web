import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router"
import { LocateFixed, Save } from "lucide-react"
import { useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { StationMap } from "@/components/station/station-map"
import { useFetch } from "@/hooks/use-fetch"
import { gatewaysApi } from "@/lib/api/endpoints"
import type { CreateStationRequest, Station } from "@/lib/api/types"
import { parseCoord, stationSchema, type StationFormValues } from "@/lib/schemas"
import { applyApiErrors } from "./api-errors"
import { FormField } from "./form-field"
import { FormRootError } from "./form-root-error"

const FIELDS = ["hardwareId", "gatewayId", "name", "description", "latitude", "longitude", "isPublic"] as const

/** Cadastro/edição de estação (página dedicada — sem dialog). */
export function StationForm({
  station,
  isAdmin,
  onSubmit,
  cancelTo,
}: {
  station?: Station
  isAdmin: boolean
  onSubmit: (body: CreateStationRequest) => Promise<unknown>
  cancelTo: () => void
}) {
  const gateways = useFetch(() => gatewaysApi.list({ size: 100, sort: "name,asc" }), [])
  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      hardwareId: station?.hardwareId ?? "",
      gatewayId: station?.gateway.id ?? "",
      name: station?.name ?? "",
      description: station?.description ?? "",
      latitude: station?.latitude != null ? String(station.latitude) : "",
      longitude: station?.longitude != null ? String(station.longitude) : "",
      isPublic: station?.isPublic ?? false,
    },
  })
  const [lat, lng, gatewayId, name] = useWatch({ control: form.control, name: ["latitude", "longitude", "gatewayId", "name"] })
  const selectedGateway = gateways.data?.content.find((g) => g.id === gatewayId)
  const ownerChanges = !!station && !!selectedGateway && selectedGateway.owner.id !== station.owner.id

  const preview = useMemo(() => {
    const la = parseCoord(lat)
    const lo = parseCoord(lng)
    if (la == null || lo == null || Number.isNaN(la) || Number.isNaN(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return []
    return [{ id: "preview", name: name || "Estação", lat: la, lng: lo }]
  }, [lat, lng, name])

  function useMyLocation() {
    if (!navigator.geolocation) return void toast.error("Geolocalização indisponível neste navegador.")
    navigator.geolocation.getCurrentPosition(
      (p) => {
        form.setValue("latitude", p.coords.latitude.toFixed(6), { shouldValidate: true, shouldDirty: true })
        form.setValue("longitude", p.coords.longitude.toFixed(6), { shouldValidate: true, shouldDirty: true })
      },
      () => toast.error("Não foi possível obter a localização."),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function submit(v: StationFormValues) {
    const latitude = parseCoord(v.latitude)
    const longitude = parseCoord(v.longitude)
    try {
      await onSubmit({
        hardwareId: v.hardwareId,
        gatewayId: v.gatewayId,
        name: v.name,
        isPublic: v.isPublic,
        ...(v.description ? { description: v.description } : {}),
        ...(latitude != null ? { latitude } : {}),
        ...(longitude != null ? { longitude } : {}),
      })
    } catch (e) {
      applyApiErrors(e, form.setError, FIELDS, {
        HARDWARE_ID_ALREADY_REGISTERED: "hardwareId",
        GATEWAY_NOT_FOUND: "gatewayId",
        // Regras de classe do backend
        locationComplete: "latitude",
        publicWithLocation: "isPublic",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{station ? "Dados da estação" : "Nova estação"}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="hardwareId"
                label="Chip ID do pluviômetro"
              >
                {(f) => <Input {...f} disabled={!!station} className="font-mono" placeholder="ex.: 580db2" autoComplete="off" />}
              </FormField>
              <FormField
                control={form.control}
                name="gatewayId"
                label="Gateway"
                description={
                  ownerChanges ? <span className="text-warning-foreground">A estação passará a ser de {selectedGateway!.owner.name}, dono deste gateway.</span> : undefined
                }
              >
                {({ value, onChange, id, "aria-invalid": invalid }) => (
                  <Select value={value} onValueChange={onChange} disabled={!gateways.data}>
                    <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
                      <SelectValue placeholder={!gateways.data ? "Carregando…" : "Escolha o gateway"} />
                    </SelectTrigger>
                    <SelectContent>
                      {gateways.data?.content.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhum gateway. <Link to="/gateways/novo" className="underline">Cadastre um</Link>.
                        </div>
                      )}
                      {gateways.data?.content.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} <span className="font-mono text-xs text-muted-foreground">{g.hardwareId}</span>
                          {isAdmin && <span className="text-muted-foreground">· {g.owner.name}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>
            <FormField control={form.control} name="name" label="Nome">
              {(f) => <Input {...f} placeholder="ex.: Sede — Lavoura 3" />}
            </FormField>
            <FormField control={form.control} name="description" label="Descrição (opcional)">
              {(f) => <Textarea {...f} rows={3} />}
            </FormField>

            <FieldSeparator>Localização e visibilidade</FieldSeparator>

            <div className="grid gap-6 md:grid-cols-[1fr_1fr_auto] md:items-start">
              <FormField control={form.control} name="latitude" label="Latitude">
                {(f) => (
                  <InputGroup>
                    <InputGroupInput {...f} inputMode="decimal" placeholder="-29.123456" />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>°</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                )}
              </FormField>
              <FormField control={form.control} name="longitude" label="Longitude">
                {(f) => (
                  <InputGroup>
                    <InputGroupInput {...f} inputMode="decimal" placeholder="-54.123456" />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>°</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                )}
              </FormField>
              <Button type="button" variant="outline" onClick={useMyLocation} className="md:mt-6">
                <LocateFixed data-icon="inline-start" /> Usar minha localização
              </Button>
            </div>
            {preview.length > 0 && <StationMap points={preview} className="h-56" zoom={13} />}
            <FormField
              control={form.control}
              name="isPublic"
              orientation="horizontal"
              label="Mostrar na área pública"
              description="Qualquer visitante vê o nome, a localização e a chuva."
            >
              {({ value, onChange, id, "aria-invalid": invalid }) => <Switch id={id} checked={value} onCheckedChange={onChange} aria-invalid={invalid} />}
            </FormField>
            <FormRootError errors={form.formState.errors} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={cancelTo}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {station ? "Salvar alterações" : "Cadastrar estação"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
