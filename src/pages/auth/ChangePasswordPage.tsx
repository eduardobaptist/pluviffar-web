import { useNavigate } from "react-router"
import { ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangePasswordForm } from "@/components/form/change-password-form"
import { AuthLayout } from "@/components/layout/auth-layout"
import { useAuth, useMe } from "@/hooks/use-auth"

export function ChangePasswordPage() {
  const me = useMe()
  const { setMe, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Defina sua senha</CardTitle>
          <CardDescription>{me.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {me.mustChangePassword && (
            <Alert>
              <ShieldAlert />
              <AlertDescription>Sua senha é provisória. Troque-a para acessar a plataforma.</AlertDescription>
            </Alert>
          )}
          <ChangePasswordForm
            submitLabel="Salvar e continuar"
            fullWidth
            onDone={async () => {
              setMe({ ...me, mustChangePassword: false })
              toast.success("Senha alterada.")
              await navigate("/painel")
            }}
          />
          <Button variant="link" className="self-center" onClick={() => void logout()}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
