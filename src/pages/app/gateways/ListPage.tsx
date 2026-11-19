import { Link } from "react-router"
import { Menu, Pencil, Plus, Router, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmAction } from "@/components/common/confirm-action"
import { DataPagination } from "@/components/common/data-pagination"
import { ALL, OwnerSelect } from "@/components/common/owner-select"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { SearchInput } from "@/components/common/search-input"
import { gatewaysApi } from "@/lib/api/endpoints"
import { useZodSearch } from "@/hooks/use-zod-search"
import type { Gateway } from "@/lib/api/types"
import { fmtDateTime } from "@/lib/format"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

const search = z.object({
  page: z.coerce.number().int().min(0).catch(0).default(0),
  search: z.string().catch("").default(""),
  ownerId: z.string().optional().catch(undefined),
  includeDeleted: z.stringbool().catch(false).default(false),
})

export function GatewaysListPage() {
  const [s, setSearch] = useZodSearch(search)
  const me = useMe()
  const isAdmin = me.role === "ADMIN"
  const set = (patch: Partial<z.infer<typeof search>>) => setSearch({ page: 0, ...patch }, { replace: true })
  const filters = {
      page: s.page,
      size: 20,
      sort: "name,asc",
      ...(s.search ? { search: s.search } : {}),
      ...(isAdmin && s.ownerId ? { ownerId: s.ownerId } : {}),
      ...(isAdmin && s.includeDeleted ? { includeDeleted: true } : {}),
    }
  const q = useFetch(() => gatewaysApi.list(filters), [JSON.stringify(filters)], { keepPrevious: true })
  const cols = isAdmin ? 6 : 5

  async function remove(g: Gateway) {
    try {
      await gatewaysApi.remove(g.id)
      toast.success(`Gateway “${g.name}” excluído.`)
      q.reload()
    } catch (e) {
      toast.error((e as Error).message)
      throw e
    }
  }

  return (
    <>
      <PageHeader
        title="Gateways"
        actions={
          <Button asChild>
            <Link to="/gateways/novo">
              <Plus data-icon="inline-start" /> Novo gateway
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={s.search} onChange={(v) => set({ search: v })} placeholder="Nome ou chip ID" />
        {isAdmin && (
          <>
            <OwnerSelect allowAll value={s.ownerId ?? ""} onChange={(v) => set({ ownerId: v === ALL ? undefined : v })} className="w-56" />
            <div className="flex items-center gap-2">
              <Switch id="inc-del" checked={s.includeDeleted} onCheckedChange={(c) => set({ includeDeleted: c })} />
              <Label htmlFor="inc-del">Incluir excluídos</Label>
            </div>
          </>
        )}
      </div>
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : q.data && q.data.totalElements === 0 && !s.search && !s.ownerId ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Router />
            </EmptyMedia>
            <EmptyTitle>Nenhum gateway cadastrado</EmptyTitle>
            <EmptyDescription>O gateway vem primeiro: as estações são vinculadas a ele.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/gateways/novo">
                <Plus data-icon="inline-start" /> Novo gateway
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
                  <TableHead className="w-10">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Chip ID</TableHead>
                  {isAdmin && <TableHead>Produtor</TableHead>}
                  <TableHead>FW / HW</TableHead>
                  <TableHead>Config. reportada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!q.data &&
                  [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={cols}>
                        <Skeleton className="h-5" />
                      </TableCell>
                    </TableRow>
                  ))}
                {q.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
                      Nenhum gateway encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {q.data?.content.map((g) => (
                  <TableRow key={g.id} className={g.deletedAt ? "opacity-60" : undefined}>
                    <TableCell>
                      {!g.deletedAt && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${g.name}`}>
                              <Menu />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem asChild>
                              <Link to={`/gateways/${g.id}`}>
                                <Pencil /> Ver / editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <ConfirmAction
                              title={`Excluir “${g.name}”?`}
                              description="Os dados já recebidos continuam guardados."
                              confirmLabel="Excluir"
                              onConfirm={() => remove(g)}
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
                    <TableCell>
                      {g.deletedAt ? (
                        <span className="flex items-center gap-2 font-medium">
                          {g.name} <Badge variant="destructive">Excluído</Badge>
                        </span>
                      ) : (
                        <Link to={`/gateways/${g.id}`} className="font-medium underline-offset-4 hover:underline">
                          {g.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{g.hardwareId}</TableCell>
                    {isAdmin && <TableCell className="text-muted-foreground">{g.owner.name}</TableCell>}
                    <TableCell className="font-mono text-xs">
                      {g.fwVersion ?? "—"} / {g.hwVersion ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDateTime(g.configReportedAt)}</TableCell>
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
