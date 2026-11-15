import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound } from "lucide-react"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { authApi } from "@/lib/api/endpoints"
import { changePasswordSchema } from "@/lib/schemas"
import { applyApiErrors } from "./api-errors"
import { FormField } from "./form-field"
import { FormRootError } from "./form-root-error"

type Values = z.infer<typeof changePasswordSchema>

export function ChangePasswordForm({ onDone, submitLabel = "Alterar senha" }: { onDone: () => void | Promise<void>; submitLabel?: string }) {
  const form = useForm<Values>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } })
  async function onSubmit(v: Values) {
    try {
      await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
      form.reset()
      await onDone()
    } catch (e) {
      applyApiErrors(e, form.setError, ["currentPassword", "newPassword"], {
        CURRENT_PASSWORD_INCORRECT: "currentPassword",
        NEW_PASSWORD_SAME_AS_CURRENT: "newPassword",
      })
    }
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="currentPassword" label="Senha atual">
          {(f) => <Input {...f} type="password" autoComplete="current-password" />}
        </FormField>
        <FormField control={form.control} name="newPassword" label="Nova senha" description="De 8 a 72 caracteres, diferente da atual.">
          {(f) => <Input {...f} type="password" autoComplete="new-password" />}
        </FormField>
        <FormField control={form.control} name="confirm" label="Confirme a nova senha">
          {(f) => <Input {...f} type="password" autoComplete="new-password" />}
        </FormField>
        <FormRootError errors={form.formState.errors} />
        <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
          {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
