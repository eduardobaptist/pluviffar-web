import { Link } from "react-router"
import { CloudRain, Download, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmAction } from "@/components/common/confirm-action"
import { DataPagination } from "@/components/common/data-pagination"
import { ALL, OwnerSelect } from "@/components/common/owner-select"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { SearchInput } from "@/components/common/search-input"
import { gatewaysApi, stationsApi } from "@/lib/api/endpoints"
import { useZodSearch } from "@/hooks/use-zod-search"
import type { Station } from "@/lib/api/types"
import { fmtDateTime } from "@/lib/format"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

const search = z.object({
  page: z.coerce.number().int().min(0).catch(0).default(0),
  search: z.string().catch("").default(""),
  gatewayId: z.string().optional().catch(undefined),
  ownerId: z.string().optional().catch(undefined),
  visibility: z.enum(["all", "public", "private"]).catch("all").default("all"),
  includeDeleted: z.stringbool().catch(false).default(false),
})

export function StationsListPage() {
  const [s, setSearch] = useZodSearch(search)
  const me = useMe()
  const isAdmin = me.role === "ADMIN"
  const set = (patch: Partial<z.infer<typeof search>>) => setSearch({ page: 0, ...patch }, { replace: true })

  const filters = {
      page: s.page,
      size: 20,
      sort: "name,asc",
      ...(s.search ? { search: s.search } : {}),
      ...(s.gatewayId ? { gatewayId: s.gatewayId } : {}),
      ...(isAdmin && s.ownerId ? { ownerId: s.ownerId } : {}),
      ...(s.visibility !== "all" ? { isPublic: s.visibility === "public" } : {}),
      ...(isAdmin && s.includeDeleted ? { includeDeleted: true } : {}),
    }
  const q = useFetch(() => stationsApi.list(filters), [JSON.stringify(filters)], { keepPrevious: true })
  const gateways = useFetch(() => gatewaysApi.list({ size: 100, sort: "name,asc" }), [])

  async function remove(st: Station) {
    try {
      await stationsApi.remove(st.id)
      toast.success(`Estação “${st.name}” excluída.`)
      q.reload()
    } catch (e) {
      toast.error((e as Error).message)
      throw e
    }
  }

  const filtered = !!(s.search || s.gatewayId || s.ownerId || s.visibility !== "all")

  return (
    <>
      <PageHeader
        title="Estações"
        description="Pluviômetros cadastrados. Só pacotes MQTT de equipamentos cadastrados são gravados."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/exportar">
                <Download data-icon="inline-start" /> Exportar
              </Link>
            </Button>
            <Button asChild>
              <Link to="/minhas-estacoes/novo">
                <Plus data-icon="inline-start" /> Nova estação
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={s.search} onChange={(v) => set({ search: v })} placeholder="Nome ou chip ID" />
        <Select value={s.gatewayId ?? ALL} onValueChange={(v) => set({ gatewayId: v === ALL ? undefined : v })}>
          <SelectTrigger className="w-48" aria-label="Gateway">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os gateways</SelectItem>
            {gateways.data?.content.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={s.visibility} onValueChange={(v) => set({ visibility: v as "all" | "public" | "private" })}>
          <SelectTrigger className="w-40" aria-label="Visibilidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="public">Públicas</SelectItem>
            <SelectItem value="private">Privadas</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <>
            <OwnerSelect allowAll value={s.ownerId ?? ""} onChange={(v) => set({ ownerId: v === ALL ? undefined : v })} className="w-56" />
            <div className="flex items-center gap-2">
              <Switch id="inc-del" checked={s.includeDeleted} onCheckedChange={(c) => set({ includeDeleted: c })} />
              <Label htmlFor="inc-del">Incluir excluídas</Label>
            </div>
          </>
        )}
      </div>

      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : q.data && q.data.totalElements === 0 && !filtered ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudRain />
            </EmptyMedia>
            <EmptyTitle>Nenhuma estação cadastrada</EmptyTitle>
            <EmptyDescription>Cadastre primeiro o gateway e depois os pluviômetros vinculados a ele.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/minhas-estacoes/novo">
                <Plus data-icon="inline-start" /> Nova estação
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estação</TableHead>
                  <TableHead>Chip ID</TableHead>
                  <TableHead>Gateway</TableHead>
                  {isAdmin && <TableHead>Produtor</TableHead>}
                  <TableHead>Visibilidade</TableHead>
                  <TableHead>Config. reportada</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!q.data &&
                  [0, 1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={isAdmin ? 7 : 6}>
                        <Skeleton className="h-5" />
                      </TableCell>
                    </TableRow>
                  ))}
                {q.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground">
                      Nenhuma estação encontrada com esses filtros.
                    </TableCell>
                  </TableRow>
                )}
                {q.data?.content.map((st) => (
                  <TableRow key={st.id} className={st.deletedAt ? "opacity-60" : undefined}>
                    <TableCell>
                      {st.deletedAt ? (
                        <span className="font-medium">{st.name}</span>
                      ) : (
                        <Link to={`/minhas-estacoes/${st.id}`} className="font-medium underline-offset-4 hover:underline">
                          {st.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{st.hardwareId}</TableCell>
                    <TableCell>{st.gateway.name}</TableCell>
                    {isAdmin && <TableCell className="text-muted-foreground">{st.owner.name}</TableCell>}
                    <TableCell>
                      {st.deletedAt ? (
                        <Badge variant="destructive">Excluída</Badge>
                      ) : st.isPublic ? (
                        <Badge>Pública</Badge>
                      ) : (
                        <Badge variant="secondary">Privada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDateTime(st.configReportedAt)}</TableCell>
                    <TableCell>
                      {!st.deletedAt && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${st.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/minhas-estacoes/${st.id}`}>
                                <Eye /> Ver dados
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/minhas-estacoes/${st.id}/editar`}>
                                <Pencil /> Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/minhas-estacoes/${st.id}?tab=exportar`}>
                                <Download /> Exportar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <ConfirmAction
                              title={`Excluir “${st.name}”?`}
                              description="As leituras gravadas são mantidas e o chip ID fica livre para novo cadastro. A estação sai da área pública."
                              confirmLabel="Excluir"
                              onConfirm={() => remove(st)}
                              trigger={
                                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                                  <Trash2 /> Excluir
                                </DropdownMenuItem>
                              }
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {q.data && <DataPagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onPageChange={(p) => setSearch({ page: p })} />}
        </>
      )}
    </>
  )
}
