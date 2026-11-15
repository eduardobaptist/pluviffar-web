import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { toast } from "sonner"
import { isApiError } from "@/lib/api/client"

/**
 * Leva os erros da API para o formulário:
 * - VALIDATION_ERROR → erro em cada campo conhecido (o resto vai para `root`);
 * - `codeToField` mapeia códigos de negócio (ex.: EMAIL_ALREADY_IN_USE → email) e nomes de
 *   regras de classe vindos em `errors[].field` (ex.: publicWithLocation → isPublic) para um campo;
 * - demais erros → `root.server` + toast.
 */
export function applyApiErrors<T extends FieldValues>(
  e: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  codeToField: Record<string, Path<T>> = {},
) {
  if (!isApiError(e)) {
    setError("root.server" as Path<T>, { message: (e as Error)?.message ?? "Erro inesperado." })
    return
  }
  const mapped = codeToField[e.code]
  if (mapped) {
    setError(mapped, { type: "server", message: e.message }, { shouldFocus: true })
    return
  }
  const unknown: string[] = []
  for (const fe of e.fieldErrors) {
    // Campo do form, ou alias (ex.: regra de classe "publicWithLocation" → isPublic).
    const target = fields.includes(fe.field) ? (fe.field as Path<T>) : codeToField[fe.field]
    if (target) setError(target, { type: "server", message: fe.message })
    else unknown.push(fe.message)
  }
  if (e.fieldErrors.length === 0 || unknown.length) {
    const message = unknown.length ? unknown.join(" ") : e.message
    setError("root.server" as Path<T>, { message })
    toast.error(message, e.traceId ? { description: `Código de rastreio: ${e.traceId}` } : undefined)
  }
}
