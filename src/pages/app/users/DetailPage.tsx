import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useParams } from "react-router"
import { ChevronLeft, KeyRound, UserCheck, UserX } from "lucide-react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ConfirmAction } from "@/components/common/confirm-action"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { applyApiErrors } from "@/components/form/api-errors"
import { FormField } from "@/components/form/form-field"
import { FormRootError } from "@/components/form/form-root-error"
import { UserForm } from "@/components/form/user-form"
import { usersApi } from "@/lib/api/endpoints"
import type { User } from "@/lib/api/types"
import { fmtDateTime } from "@/lib/format"
import { resetPasswordSchema } from "@/lib/schemas"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

function ResetPasswordCard({ userId, onDone }: { userId: string; onDone: () => void }) {
  const form = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: "", confirm: "" } })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>O usuário deverá trocá-la no próximo acesso.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (v) => {
            try {
              await usersApi.resetPassword(userId, v.newPassword)
              form.reset()
              onDone()
              toast.success("Senha provisória definida.")
            } catch (e) {
              applyApiErrors(e, form.setError, ["newPassword"])
            }
          })}
        >
          <FieldGroup>
            <FormField control={form.control} name="newPassword" label="Nova senha provisória">
              {(f) => <Input {...f} type="password" autoComplete="new-password" />}
            </FormField>
            <FormField control={form.control} name="confirm" label="Confirme">
              {(f) => <Input {...f} type="password" autoComplete="new-password" />}
            </FormField>
            <FormRootError errors={form.formState.errors} />
            <Button type="submit" variant="outline" className="self-start" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />}
              Redefinir senha
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

function ToggleStatus({ user: u, onToggle }: { user: User; onToggle: () => Promise<void> }) {
  return (
    <ConfirmAction
      title={u.active ? `Desativar ${u.name}?` : `Ativar ${u.name}?`}
      description={u.active ? "O usuário perde o acesso imediatamente." : "O usuário volta a poder entrar."}
      confirmLabel={u.active ? "Desativar" : "Ativar"}
      destructive={u.active}
      onConfirm={onToggle}
      trigger={
        <Button size="sm" variant={u.active ? "destructive" : "outline"}>
          {u.active ? <UserX data-icon="inline-start" /> : <UserCheck data-icon="inline-start" />}
          {u.active ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  )
}

export function UserDetailPage() {
  const id = useParams().id!
  const me = useMe()
  const navigate = useNavigate()
  const q = useFetch(() => usersApi.get(id), [id])
  const u = q.data
  const isSelf = me.id === id

  if (q.error) return <QueryError error={q.error} onRetry={q.reload} />

  async function toggleStatus() {
    try {
      const updated = await usersApi.setStatus(id, !u!.active)
      q.setData(updated)
      toast.success(updated.active ? "Usuário ativado." : "Usuário desativado e sessões encerradas.")
    } catch (e) {
      toast.error((e as Error).message)
      throw e
    }
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/usuarios">
          <ChevronLeft data-icon="inline-start" /> Usuários
        </Link>
      </Button>
      <PageHeader
        title={u?.name ?? <Skeleton className="h-9 w-56" />}
      />
      {!u ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <UserForm
            key={u.updatedAt}
            user={u}
            isSelf={isSelf}
            onCancel={() => void navigate("/usuarios")}
            onSubmit={async (v) => {
              const updated = await usersApi.update(id, { name: v.name, email: v.email, role: v.role })
              q.setData(updated)
              toast.success("Usuário atualizado.")
            }}
            action={!isSelf && <ToggleStatus user={u} onToggle={toggleStatus} />}
            info={
              <>
                {u.mustChangePassword && <Row k="Senha">Provisória (troca pendente)</Row>}
                <Row k="Criado em">{fmtDateTime(u.createdAt)}</Row>
                <Row k="Última alteração">{fmtDateTime(u.updatedAt)}</Row>
              </>
            }
          />
          <ResetPasswordCard userId={id} onDone={q.reload} />
        </div>
      )}
    </>
  )
}
