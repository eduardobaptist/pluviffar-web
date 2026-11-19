import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, LogIn, RotateCw, ServerCrash } from "lucide-react"
import { Link } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { applyApiErrors } from "@/components/form/api-errors"
import { FormField } from "@/components/form/form-field"
import { FormRootError } from "@/components/form/form-root-error"
import { AuthLayout } from "@/components/layout/auth-layout"
import { useAuth } from "@/hooks/use-auth"
import { isUnavailable } from "@/lib/api/client"
import { loginSchema } from "@/lib/schemas"

type Values = z.infer<typeof loginSchema>

/** Login. O redirecionamento pós-login (para `?redirect=` ou /painel) fica em `<RedirectIfAuthed>`. */
export function LoginPage() {
  const { login, error, loading, refresh } = useAuth()
  const offline = isUnavailable(error)
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })

  async function onSubmit(v: Values) {
    try {
      await login(v)
    } catch (e) {
      applyApiErrors(e, form.setError, ["email", "password"])
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 w-fit text-muted-foreground">
            <Link to="/">
              <ArrowLeft data-icon="inline-start" /> Voltar ao site
            </Link>
          </Button>
          <CardTitle className="text-xl">Entrar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {offline && (
            <Alert variant="destructive">
              <ServerCrash />
              <AlertTitle>Servidor indisponível</AlertTitle>
              <AlertDescription>
                Não foi possível conectar ao servidor. Tente de novo em instantes.
                <Button size="sm" variant="outline" className="mt-2" onClick={() => void refresh()} disabled={loading}>
                  {loading ? <Spinner data-icon="inline-start" /> : <RotateCw data-icon="inline-start" />} Tentar de novo
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <FormField control={form.control} name="email" label="E-mail">
                {(f) => <Input {...f} type="email" autoComplete="username" placeholder="voce@exemplo.com" autoFocus />}
              </FormField>
              <FormField control={form.control} name="password" label="Senha">
                {(f) => <Input {...f} type="password" autoComplete="current-password" />}
              </FormField>
              <FormRootError errors={form.formState.errors} />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}
                Entrar
              </Button>
              <FieldDescription className="text-center">
                Esqueceu a senha? Fale com o administrador.
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
