import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

/** Cadastro (com senha provisória) ou edição (nome, e-mail, perfil) de usuário. */
export function UserForm({
  user,
  isSelf,
  onSubmit,
  onCancel,
}: {
  user?: User
  isSelf?: boolean
  onSubmit: (v: Values) => Promise<unknown>
  onCancel: () => void
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
          <CardDescription>
            {user ? "Trocar o perfil encerra as sessões do usuário." : "O usuário recebe uma senha provisória e precisa trocá-la no primeiro login."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FormField control={form.control} name="name" label="Nome">
              {(f) => <Input {...f} autoComplete="off" />}
            </FormField>
            <FormField control={form.control} name="email" label="E-mail" description="Único; usado para login.">
              {(f) => <Input {...f} type="email" autoComplete="off" />}
            </FormField>
            <FormField control={form.control} name="role" label="Perfil" description={isSelf ? "Você não pode alterar o próprio perfil." : "Produtor gerencia só os próprios gateways e estações; administrador vê e gerencia tudo."}>
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
              <FormField control={form.control} name="password" label="Senha provisória" description="De 8 a 72 caracteres. Repasse ao usuário por um canal seguro.">
                {(f) => <Input {...f} type="password" autoComplete="new-password" />}
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
            {user ? "Salvar alterações" : "Cadastrar usuário"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
