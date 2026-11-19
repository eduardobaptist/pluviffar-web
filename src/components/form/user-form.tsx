import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { Role, User } from "@/lib/api/types"
import { ROLE_LABEL } from "@/lib/format"
import { createUserSchema, userSchema } from "@/lib/schemas"
import { applyApiErrors } from "./api-errors"
import { FormField } from "./form-field"
import { FormRootError } from "./form-root-error"

type Values = z.infer<typeof createUserSchema>

/**
 * Cadastro (com senha provisória) ou edição (nome, e-mail, perfil) de usuário.
 * `action`: canto do cabeçalho (ex.: ativar/desativar); `info`: informações somente leitura abaixo dos campos.
 */
export function UserForm({
  user,
  isSelf,
  onSubmit,
  onCancel,
  action,
  info,
}: {
  user?: User
  isSelf?: boolean
  onSubmit: (v: Values) => Promise<unknown>
  onCancel: () => void
  action?: ReactNode
  info?: ReactNode
}) {
  const form = useForm<Values>({
    // Na edição a senha não é enviada (redefinição tem formulário próprio).
    resolver: zodResolver(user ? userSchema.extend({ password: z.string() }) : createUserSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "PRODUCER", password: "" },
  })
  async function submit(v: Values) {
    try {
      await onSubmit(v)
    } catch (e) {
      applyApiErrors(e, form.setError, ["name", "email", "role", "password"], {
        EMAIL_ALREADY_IN_USE: "email",
        CANNOT_CHANGE_OWN_ROLE: "role",
      })
    }
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{user ? "Dados do usuário" : "Novo usuário"}</CardTitle>
          {user && <CardDescription>Trocar o perfil encerra as sessões do usuário.</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FormField control={form.control} name="name" label="Nome">
              {(f) => <Input {...f} autoComplete="off" />}
            </FormField>
            <FormField control={form.control} name="email" label="E-mail">
              {(f) => <Input {...f} type="email" autoComplete="off" />}
            </FormField>
            <FormField control={form.control} name="role" label="Perfil" description={isSelf ? "Você não pode alterar o próprio perfil." : undefined}>
              {({ value, onChange, id, "aria-invalid": invalid }) => (
                <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={isSelf}>
                  <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            {!user && (
              <FormField control={form.control} name="password" label="Senha provisória" description="O usuário troca a senha no primeiro acesso.">
                {(f) => <Input {...f} type="password" autoComplete="new-password" />}
              </FormField>
            )}
            <FormRootError errors={form.formState.errors} />
          </FieldGroup>
          {info && <div className="mt-6 border-t pt-2">{info}</div>}
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {user ? "Salvar alterações" : "Cadastrar usuário"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
