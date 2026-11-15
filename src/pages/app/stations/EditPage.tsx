import { Link, useNavigate, useParams } from "react-router"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { StationForm } from "@/components/form/station-form"
import { stationsApi } from "@/lib/api/endpoints"
import { useMe } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"

export function StationEditPage() {
  const id = useParams().id!
  const me = useMe()
  const navigate = useNavigate()
  const q = useFetch(() => stationsApi.get(id), [id])
  const back = () => void navigate(`/minhas-estacoes/${id}`)
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to={`/minhas-estacoes/${id}`}>
          <ChevronLeft data-icon="inline-start" /> {q.data?.name ?? "Estação"}
        </Link>
      </Button>
      <PageHeader title="Editar estação" />
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : !q.data ? (
        <Skeleton className="h-[480px] rounded-xl" />
      ) : (
        <StationForm
          station={q.data}
          isAdmin={me.role === "ADMIN"}
          cancelTo={back}
          onSubmit={async ({ hardwareId: _ignored, ...body }) => {
            await stationsApi.update(id, body)
            toast.success("Estação atualizada.")
            back()
          }}
        />
      )}
    </>
  )
}
