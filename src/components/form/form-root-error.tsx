import { AlertCircle } from "lucide-react"
import type { FieldErrors } from "react-hook-form"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function FormRootError({ errors }: { errors: FieldErrors }) {
  const msg = (errors.root as { server?: { message?: string } } | undefined)?.server?.message
  if (!msg) return null
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{msg}</AlertDescription>
    </Alert>
  )
}
