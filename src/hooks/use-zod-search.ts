import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import type { z } from "zod"

type Raw = Record<string, string | string[]>

/** Query string → objeto cru (chave repetida vira array). Os schemas fazem a coerção (`z.coerce`, `z.stringbool`). */
function toRaw(sp: URLSearchParams): Raw {
  const out: Raw = {}
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key)
    out[key] = all.length > 1 ? all : all[0]!
  }
  return out
}

/** Objeto → query string, omitindo vazios e valores iguais ao padrão do schema (URL limpa). */
function toParams(values: Record<string, unknown>, defaults: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null || v === "" || v === defaults[k]) continue
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)))
    else sp.set(k, String(v))
  }
  return sp
}

/**
 * Search params da URL validados por um schema Zod (filtros, página, aba).
 * Retorna `[valores, set]`; `set(patch)` mescla com os valores atuais.
 */
export function useZodSearch<T extends Record<string, unknown>>(schema: z.ZodType<T, unknown>) {
  const [sp, setSp] = useSearchParams()
  const value = useMemo(() => schema.parse(toRaw(sp)), [schema, sp])
  const defaults = useMemo(() => schema.parse({}) as Record<string, unknown>, [schema])

  const set = useCallback(
    (patch: Partial<T>, opts?: { replace?: boolean }) => {
      setSp((prev) => toParams({ ...schema.parse(toRaw(prev)), ...patch }, defaults), opts)
    },
    [schema, defaults, setSp],
  )

  return [value, set] as const
}
