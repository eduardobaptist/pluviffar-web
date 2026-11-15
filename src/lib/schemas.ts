import { z } from "zod"

/** Schemas Zod dos formulários — limites espelham o docs/openapi.yml. */

const trimmed = (max: number, label: string) =>
  z.string().trim().min(1, `Informe ${label}.`).max(max, `Máximo de ${max} caracteres.`)

export const hardwareId = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,32}$/, "Use de 1 a 32 caracteres: letras minúsculas, números e hífen.")

export const password = z.string().min(8, "Mínimo de 8 caracteres.").max(72, "Máximo de 72 caracteres.")

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail."),
  password: z.string().min(1, "Informe a senha."),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: password,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "As senhas não conferem." })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "A nova senha deve ser diferente da atual." })

export const userSchema = z.object({
  name: trimmed(120, "o nome"),
  email: z.email("E-mail inválido.").trim().max(254),
  role: z.enum(["ADMIN", "PRODUCER"]),
})

export const createUserSchema = userSchema.extend({ password })

export const resetPasswordSchema = z
  .object({ newPassword: password, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "As senhas não conferem." })

export const gatewaySchema = z.object({
  hardwareId,
  name: trimmed(100, "o nome"),
  description: z.string().trim().max(1000, "Máximo de 1000 caracteres."),
  ownerId: z.string(),
})

/** Coordenada opcional digitada como texto (aceita vírgula decimal). */
const coord = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((s) => s === "" || /^-?\d+([.,]\d+)?$/.test(s), `${label} inválida.`)
    .refine((s) => s === "" || (Number(s.replace(",", ".")) >= min && Number(s.replace(",", ".")) <= max), `${label} deve estar entre ${min} e ${max}.`)

export const stationSchema = z
  .object({
    hardwareId,
    gatewayId: z.string().min(1, "Escolha o gateway."),
    name: trimmed(100, "o nome"),
    description: z.string().trim().max(1000, "Máximo de 1000 caracteres."),
    latitude: coord(-90, 90, "Latitude"),
    longitude: coord(-180, 180, "Longitude"),
    isPublic: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // Regras do backend: locationComplete e publicWithLocation.
    if ((v.latitude === "") !== (v.longitude === "")) {
      ctx.addIssue({ code: "custom", path: [v.latitude === "" ? "latitude" : "longitude"], message: "Informe latitude e longitude juntas." })
    }
    if (v.isPublic && (v.latitude === "" || v.longitude === "")) {
      ctx.addIssue({ code: "custom", path: ["isPublic"], message: "Estação pública exige latitude e longitude." })
    }
  })

export type StationFormValues = z.infer<typeof stationSchema>

export const parseCoord = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s.replace(",", ".")))
