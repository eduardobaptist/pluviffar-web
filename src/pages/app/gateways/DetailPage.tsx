import { Link, useNavigate, useParams } from "react-router"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/common/confirm-action"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { GatewayForm } from "@/components/form/gateway-form"
import { gatewaysApi, stationsApi } from "@/lib/api/endpoints"
import { fmtDateTime } from "@/lib/format"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

export function GatewayDetailPage() {
  const id = useParams().id!
  const me = useMe()
  const navigate = useNavigate()
  const q = useFetch(() => gatewaysApi.get(id), [id])
  const stations = useFetch(() => stationsApi.list({ gatewayId: id, size: 100, sort: "name,asc" }), [id])
  const g = q.data

  if (q.error) return <QueryError error={q.error} onRetry={q.reload} />

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/gateways">
          <ChevronLeft data-icon="inline-start" /> Gateways
        </Link>
      </Button>
      <PageHeader
        title={g?.name ?? <Skeleton className="h-9 w-56" />}
        description={g && `Chip ${g.hardwareId} · FW ${g.fwVersion ?? "—"} / HW ${g.hwVersion ?? "—"} · config. reportada ${fmtDateTime(g.configReportedAt)}`}
        actions={
          g && (
            <ConfirmAction
              title={`Excluir “${g.name}”?`}
              description="Os dados já recebidos continuam guardados."
              confirmLabel="Excluir"
              onConfirm={async () => {
                try {
                  await gatewaysApi.remove(id)
                  toast.success("Gateway excluído.")
                  await navigate("/gateways")
                } catch (e) {
                  toast.error((e as Error).message)
                  throw e
                }
              }}
              trigger={
                <Button variant="destructive">
                  <Trash2 data-icon="inline-start" /> Excluir
                </Button>
              }
            />
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {g ? (
          <GatewayForm
            key={g.updatedAt}
            gateway={g}
            isAdmin={me.role === "ADMIN"}
            onCancel={() => void navigate("/gateways")}
            onSubmit={async ({ hardwareId: _h, ...body }) => {
              const updated = await gatewaysApi.update(id, body)
              q.setData(updated)
              toast.success("Gateway atualizado.")
            }}
          />
        ) : (
          <Skeleton className="h-96 rounded-xl" />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Estações vinculadas</CardTitle>
            <CardDescription>{stations.data ? `${stations.data.totalElements} estação(ões)` : "Carregando…"}</CardDescription>
            <CardAction>
              <Button asChild size="sm" variant="outline">
                <Link to="/minhas-estacoes/novo">
                  <Plus data-icon="inline-start" /> Nova
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-2">
              {stations.data?.content.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma estação vinculada.</p>}
              {stations.data?.content.map((s) => (
                <Item key={s.id} variant="outline" size="sm" asChild>
                  <Link to={`/minhas-estacoes/${s.id}`}>
                    <ItemContent>
                      <ItemTitle>{s.name}</ItemTitle>
                      <ItemDescription className="font-mono text-xs">{s.hardwareId}</ItemDescription>
                    </ItemContent>
                    <ItemActions>{s.isPublic ? <Badge>Pública</Badge> : <Badge variant="secondary">Privada</Badge>}</ItemActions>
                  </Link>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
