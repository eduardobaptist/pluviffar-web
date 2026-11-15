import { Link, useNavigate } from "react-router"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { StationForm } from "@/components/form/station-form"
import { stationsApi } from "@/lib/api/endpoints"
import { useMe } from "@/hooks/use-auth"

export function StationNewPage() {
  const me = useMe()
  const navigate = useNavigate()
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/minhas-estacoes">
          <ChevronLeft data-icon="inline-start" /> Estações
        </Link>
      </Button>
      <PageHeader title="Cadastrar estação" description="Registre o chip ID do pluviômetro e vincule a um gateway." />
      <StationForm
        isAdmin={me.role === "ADMIN"}
        cancelTo={() => void navigate("/minhas-estacoes")}
        onSubmit={async (body) => {
          const st = await stationsApi.create(body)
          toast.success(`Estação “${st.name}” cadastrada.`)
          await navigate(`/minhas-estacoes/${st.id}`)
        }}
      />
    </>
  )
}
