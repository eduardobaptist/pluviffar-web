import { Link } from "react-router"
import { ChevronRight, CloudRain, Download, Globe, Map as MapIcon, Plus, Router, UserPlus, Users, type LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { StationMap, type MapPoint } from "@/components/station/station-map"
import { stationsApi, usersApi } from "@/lib/api/endpoints"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"
import { pool } from "@/lib/export"
import { fmtMm, mm24h } from "@/lib/format"

function Kpi({ icon: Icon, label, value, to }: { icon: LucideIcon; label: string; value: number | undefined; to: string }) {
  return (
    <Link to={to} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-base font-medium text-foreground md:text-lg">
            <Icon className="size-5 text-muted-foreground" aria-hidden /> {label}
          </CardDescription>
          <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
            {value ?? <Skeleton className="h-10 w-16" />}
          </CardTitle>
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
  { to: "/exportar", label: "Exportar dados", description: "CSV/XLSX de várias estações", icon: Download },
  { to: "/mapa", label: "Mapa público", description: "Como a rede aparece para o público", icon: Globe },
]

/** Painel do ADMIN: números da rede, atalhos e mapa com todas as estações. */
export function AdminDashboard() {
  const me = useMe()
  const stations = useFetch((signal) => stationsApi.listAll({ sort: "name,asc" }, signal), [])
  const users = useFetch(() => usersApi.list({ size: 1 }), [])

  const list = stations.data
  // A listagem não traz a chuva recente (ver "Falta na API"): um /overview por estação com coordenadas, 6 por vez.
  const located = useMemo(() => (list ?? []).filter((s) => s.latitude != null && s.longitude != null), [list])
  const rain = useFetch(
    located.length
      ? async (signal) => {
          const entries = await pool(
            located.map((s) => async () => {
              try {
                const o = await stationsApi.overview(s.id, undefined, signal)
                return [s.id, mm24h(o.precipitation.last24hMm, o.lastReading?.measuredAt)] as const
              } catch (e) {
                if (signal.aborted) throw e
                return [s.id, undefined] as const // falhou: ponto neutro, nunca "0 mm"
              }
            }),
            6,
          )
          return new Map<string, number | null | undefined>(entries)
        }
      : null,
    [located],
  )
  const rainById = rain.data
  const points = useMemo<MapPoint[]>(
    () =>
      located.map((s) => {
        const mm = rainById?.get(s.id)
        return {
          id: s.id,
          name: s.name,
          lat: s.latitude!,
          lng: s.longitude!,
          info: [...(rainById ? [`24 h: ${fmtMm(mm)}`] : []), s.owner.name, `Gateway: ${s.gateway.name}`, s.isPublic ? "Pública" : "Privada"],
          href: "private",
          mm,
        }
      }),
    [located, rainById],
  )

  return (
    <>
      <PageHeader title={`Olá, ${me.name.split(" ")[0]}`} description="Visão geral." />

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi icon={Users} label="Usuários" value={users.data?.totalElements} to="/usuarios" />
        <Kpi icon={CloudRain} label="Estações" value={list?.length} to="/minhas-estacoes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="size-4" aria-hidden /> Mapa de estações
            </CardTitle>
            <CardDescription>
              {list
                ? `${points.length} de ${list.length} estações com coordenadas cadastradas${rain.loading ? " · carregando chuva das últimas 24 h…" : ""}. Clique num ponto para ver detalhes.`
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
