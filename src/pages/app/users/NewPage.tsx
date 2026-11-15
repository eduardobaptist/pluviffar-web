import { Link, useNavigate } from "react-router"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { UserForm } from "@/components/form/user-form"
import { usersApi } from "@/lib/api/endpoints"

export function UserNewPage() {
  const navigate = useNavigate()
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/usuarios">
          <ChevronLeft data-icon="inline-start" /> Usuários
        </Link>
      </Button>
      <PageHeader title="Cadastrar usuário" />
      <div className="max-w-2xl">
        <UserForm
          onCancel={() => void navigate("/usuarios")}
          onSubmit={async (v) => {
            const u = await usersApi.create(v)
            toast.success(`Usuário “${u.name}” cadastrado com senha provisória.`)
            await navigate(`/usuarios/${u.id}`)
          }}
        />
      </div>
    </>
  )
}
