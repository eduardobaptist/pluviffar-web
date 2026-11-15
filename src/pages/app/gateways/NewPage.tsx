import { Link, useNavigate } from "react-router"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { GatewayForm } from "@/components/form/gateway-form"
import { gatewaysApi } from "@/lib/api/endpoints"
import { useMe } from "@/hooks/use-auth"

export function GatewayNewPage() {
  const me = useMe()
  const navigate = useNavigate()
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/gateways">
          <ChevronLeft data-icon="inline-start" /> Gateways
        </Link>
      </Button>
      <PageHeader title="Cadastrar gateway" description="Só pacotes MQTT de equipamentos cadastrados são gravados." />
      <GatewayForm
        isAdmin={me.role === "ADMIN"}
        onCancel={() => void navigate("/gateways")}
        onSubmit={async (body) => {
          const g = await gatewaysApi.create(body)
          toast.success(`Gateway “${g.name}” cadastrado.`)
          await navigate(`/gateways/${g.id}`)
        }}
      />
    </>
  )
}
