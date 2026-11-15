import type { ReactNode } from "react"
import { Controller, type Control, type ControllerRenderProps, type FieldPath, type FieldValues } from "react-hook-form"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>
  name: N
  label: ReactNode
  description?: ReactNode
  /** id do controle; padrão = name. Use o mesmo id no input para o label funcionar. */
  id?: string
  orientation?: "vertical" | "horizontal" | "responsive"
  children: (field: ControllerRenderProps<T, N> & { id: string; "aria-invalid": boolean }) => ReactNode
}

/**
 * Padrão de formulário recomendado pelo shadcn/ui atual: React Hook Form
 * (`Controller`) + componentes `Field*` + validação Zod via `zodResolver`.
 * Este helper só elimina o boilerplate de label/descrição/erro.
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  id,
  orientation = "vertical",
  children,
}: FormFieldProps<T, N>) {
  const fieldId = id ?? `f-${name.replace(/\./g, "-")}`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const control = children({ ...field, id: fieldId, "aria-invalid": fieldState.invalid })
        const meta = (
          <>
            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </>
        )
        return orientation === "horizontal" ? (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            {control}
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor={fieldId} className="font-normal">
                {label}
              </FieldLabel>
              {meta}
            </div>
          </Field>
        ) : (
          <Field orientation={orientation} data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
            {control}
            {meta}
          </Field>
        )
      }}
    />
  )
}
