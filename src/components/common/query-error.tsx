import { AlertCircle, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { isApiError } from "@/lib/api/client"

export function QueryError({ error, onRetry, title = "Não foi possível carregar os dados" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const msg = (error as Error)?.message ?? "Erro inesperado."
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{msg}</p>
        {isApiError(error) && error.traceId && <p className="font-mono text-xs">Rastreio: {error.traceId}</p>}
        {onRetry && (
          <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
            <RotateCw data-icon="inline-start" /> Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
