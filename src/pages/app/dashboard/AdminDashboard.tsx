import { Link } from "react-router"
import { ChevronRight, CloudRain, Download, GitCompare, Globe, Map as MapIcon, Plus, Router, UserPlus, Users, type LucideIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { StationMap, type MapPoint } from "@/components/station/station-map"
import { gatewaysApi, stationsApi, usersApi } from "@/lib/api/endpoints"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

function Kpi({ icon: Icon, label, value, hint, to }: { icon: LucideIcon; label: string; value: number | undefined; hint?: ReactNode; to: string }) {
  return (
    <Link to={to} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card size="sm" className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Icon className="size-4" aria-hidden /> {label}
          </CardDescription>
          <CardTitle className="text-3xl tabular-nums">{value ?? <Skeleton className="h-8 w-12" />}</CardTitle>
          {hint && <CardDescription className="text-xs">{hint}</CardDescription>}
        </CardHeader>
      </Card>
    </Link>
  )
}

const SHORTCUTS: { to: string; label: string; description: string; icon: LucideIcon }[] = [
  { to: "/usuarios/novo", label: "Novo usuário", description: "Cadastrar produtor ou administrador", icon: UserPlus },
  { to: "/gateways/novo", label: "Novo gateway", description: "Vincular um gateway a um produtor", icon: Router },
  { to: "/minhas-estacoes/novo", label: "Nova estação", description: "Cadastrar pluviômetro", icon: Plus },
  { to: "/usuarios", label: "Usuários", description: "Ativar, desativar e redefinir senhas", icon: Users },
  { to: "/meu-comparativo", label: "Comparativo", description: "Comparar 2 a 5 estações", icon: GitCompare },
  { to: "/exportar", label: "Exportar dados", description: "CSV/XLSX de várias estações", icon: Download },
  { to: "/mapa", label: "Mapa público", description: "Como a rede aparece para o público", icon: Globe },
]

/** Painel do ADMIN: números da rede, atalhos e mapa com todas as estações. */
export function AdminDashboard() {
  const me = useMe()
  const stations = useFetch((signal) => stationsApi.listAll({ sort: "name,asc" }, signal), [])
  const users = useFetch(() => usersApi.list({ size: 1 }), [])
  const activeUsers = useFetch(() => usersApi.list({ active: true, size: 1 }), [])
  const gateways = useFetch(() => gatewaysApi.list({ size: 1 }), [])

  const list = stations.data
  const publicCount = list?.filter((s) => s.isPublic).length
  const points = useMemo<MapPoint[]>(
    () =>
      (list ?? [])
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.latitude!,
          lng: s.longitude!,
          info: [s.owner.name, `Gateway: ${s.gateway.name}`, s.isPublic ? "Pública" : "Privada"],
          href: "private",
        })),
    [list],
  )

  return (
    <>
      <PageHeader title={`Olá, ${me.name.split(" ")[0]}`} description="Visão geral da rede PluvIFFar." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={Users}
          label="Usuários"
          value={users.data?.totalElements}
          hint={activeUsers.data ? `${activeUsers.data.totalElements} ativos` : undefined}
          to="/usuarios"
        />
        <Kpi icon={CloudRain} label="Estações" value={list?.length} to="/minhas-estacoes" />
        <Kpi
          icon={Globe}
          label="Estações públicas"
          value={publicCount}
          hint={list ? `${list.length - (publicCount ?? 0)} privadas` : undefined}
          to="/minhas-estacoes?visibility=public"
        />
        <Kpi icon={Router} label="Gateways" value={gateways.data?.totalElements} to="/gateways" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="size-4" aria-hidden /> Mapa da rede
            </CardTitle>
            <CardDescription>
              {list
                ? `${points.length} de ${list.length} estações com coordenadas cadastradas. Clique num ponto para ver detalhes.`
                : "Carregando estações…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stations.error ? (
              <QueryError error={stations.error} onRetry={stations.reload} />
            ) : !list ? (
              <Skeleton className="h-[26rem] rounded-xl" />
            ) : (
              <StationMap points={points} className="h-80 sm:h-[26rem]" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acesso rápido</CardTitle>
            <CardDescription>Cadastros e ferramentas da administração.</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-1">
              {SHORTCUTS.map(({ to, label, description, icon: Icon }) => (
                <Item key={to} asChild size="sm">
                  <Link to={to}>
                    <ItemMedia variant="icon">
                      <Icon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{label}</ItemTitle>
                      <ItemDescription>{description}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </ItemActions>
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
