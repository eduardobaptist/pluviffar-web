import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { PageHeader } from "@/components/common/page-header"
import { ChangePasswordForm } from "@/components/form/change-password-form"
import { ROLE_LABEL } from "@/lib/format"
import { useMe } from "@/hooks/use-auth"

export function ProfilePage() {
  const me = useMe()
  return (
    <>
      <PageHeader title="Meu perfil" description="Nome, e-mail e perfil são alterados pelo administrador." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-2">
              <Item variant="muted" size="sm">
                <ItemContent>
                  <ItemDescription>Nome</ItemDescription>
                  <ItemTitle>{me.name}</ItemTitle>
                </ItemContent>
              </Item>
              <Item variant="muted" size="sm">
                <ItemContent>
                  <ItemDescription>E-mail</ItemDescription>
                  <ItemTitle>{me.email}</ItemTitle>
                </ItemContent>
              </Item>
              <Item variant="muted" size="sm">
                <ItemContent>
                  <ItemDescription>Perfil</ItemDescription>
                  <ItemTitle>{ROLE_LABEL[me.role]}</ItemTitle>
                </ItemContent>
              </Item>
            </ItemGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>Suas outras sessões serão encerradas; esta continua ativa.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm onDone={() => void toast.success("Senha alterada.")} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
