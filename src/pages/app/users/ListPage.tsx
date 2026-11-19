import { Link } from "react-router"
import { Menu, Pencil, Plus, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmAction } from "@/components/common/confirm-action"
import { DataPagination } from "@/components/common/data-pagination"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { SearchInput } from "@/components/common/search-input"
import { usersApi } from "@/lib/api/endpoints"
import type { User } from "@/lib/api/types"
import { useMe } from "@/hooks/use-auth"
import { useZodSearch } from "@/hooks/use-zod-search"
import { fmtDate, ROLE_LABEL } from "@/lib/format"
import { useFetch } from "@/hooks/use-fetch"

const search = z.object({
  page: z.coerce.number().int().min(0).catch(0).default(0),
  search: z.string().catch("").default(""),
  role: z.enum(["all", "ADMIN", "PRODUCER"]).catch("all").default("all"),
  status: z.enum(["all", "active", "inactive"]).catch("all").default("all"),
})

export function UsersListPage() {
  const [s, setSearch] = useZodSearch(search)
  const set = (patch: Partial<z.infer<typeof search>>) => setSearch({ page: 0, ...patch }, { replace: true })
  const filters = {
      page: s.page,
      size: 20,
      sort: "name,asc",
      ...(s.search ? { search: s.search } : {}),
      ...(s.role !== "all" ? { role: s.role } : {}),
      ...(s.status !== "all" ? { active: s.status === "active" } : {}),
    }
  const q = useFetch(() => usersApi.list(filters), [JSON.stringify(filters)], { keepPrevious: true })
  const me = useMe()

  async function toggleStatus(u: User) {
    try {
      const updated = await usersApi.setStatus(u.id, !u.active)
      toast.success(updated.active ? `${u.name} ativado.` : `${u.name} desativado.`)
      q.reload()
    } catch (e) {
      toast.error((e as Error).message)
      throw e
    }
  }
  return (
    <>
      <PageHeader
        title="Usuários"
        actions={
          <Button asChild>
            <Link to="/usuarios/novo">
              <Plus data-icon="inline-start" /> Novo usuário
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={s.search} onChange={(v) => set({ search: v })} placeholder="Nome ou e-mail" />
        <Select value={s.role} onValueChange={(v) => set({ role: v as "all" })}>
          <SelectTrigger className="w-44" aria-label="Perfil">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="PRODUCER">Produtores</SelectItem>
            <SelectItem value="ADMIN">Administradores</SelectItem>
          </SelectContent>
        </Select>
        <Select value={s.status} onValueChange={(v) => set({ status: v as "all" })}>
          <SelectTrigger className="w-40" aria-label="Situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Desativados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!q.data &&
                  [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-5" />
                      </TableCell>
                    </TableRow>
                  ))}
                {q.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {q.data?.content.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${u.name}`}>
                            <Menu />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem asChild>
                            <Link to={`/usuarios/${u.id}`}>
                              <Pencil /> Editar
                            </Link>
                          </DropdownMenuItem>
                          {u.id !== me.id && (
                            <>
                              <DropdownMenuSeparator />
                              <ConfirmAction
                                title={u.active ? `Desativar ${u.name}?` : `Ativar ${u.name}?`}
                                description={u.active ? "O usuário perde o acesso imediatamente." : "O usuário volta a poder entrar."}
                                confirmLabel={u.active ? "Desativar" : "Ativar"}
                                destructive={u.active}
                                onConfirm={() => toggleStatus(u)}
                                trigger={
                                  <DropdownMenuItem variant={u.active ? "destructive" : "default"} onSelect={(e) => e.preventDefault()}>
                                    {u.active ? <UserX /> : <UserCheck />} {u.active ? "Desativar" : "Ativar"}
                                  </DropdownMenuItem>
                                }
                              />
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <Link to={`/usuarios/${u.id}`} className="font-medium underline-offset-4 hover:underline">
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {u.active ? <Badge>Ativo</Badge> : <Badge variant="destructive">Desativado</Badge>}
                      {u.mustChangePassword && <Badge variant="outline">Senha provisória</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
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
