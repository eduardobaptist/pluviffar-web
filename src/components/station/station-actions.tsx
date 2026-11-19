import { Link } from "react-router"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/common/confirm-action"
import { stationsApi } from "@/lib/api/endpoints"
import type { Station } from "@/lib/api/types"

/** Botões Editar / Excluir de uma estação (detalhe e painel do produtor). */
export function StationActions({ station, onDeleted }: { station: Pick<Station, "id" | "name">; onDeleted: () => void | Promise<void> }) {
  return (
    <>
      <Button asChild variant="outline">
        <Link to={`/minhas-estacoes/${station.id}/editar`}>
          <Pencil data-icon="inline-start" /> Editar
        </Link>
      </Button>
      <ConfirmAction
        title={`Excluir “${station.name}”?`}
        description="As leituras já recebidas continuam guardadas."
        confirmLabel="Excluir"
        onConfirm={async () => {
          try {
            await stationsApi.remove(station.id)
            toast.success("Estação excluída.")
            await onDeleted()
          } catch (e) {
            toast.error((e as Error).message)
            throw e
          }
        }}
        trigger={
          <Button variant="destructive">
            <Trash2 data-icon="inline-start" /> Excluir
          </Button>
        }
      />
    </>
  )
}
