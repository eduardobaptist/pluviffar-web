import type { ApiErrorBody, FieldError } from "./types"

/**
 * Cliente HTTP da API PluvIFFar.
 *
 * - Sessão por cookie (SESSION, HttpOnly) → sempre `credentials: "include"`.
 * - CSRF: toda requisição mutável leva `X-XSRF-TOKEN` com o valor atual do cookie
 *   `XSRF-TOKEN` (reemitido em toda resposta). Se o cookie ainda não existe,
 *   chamamos `GET /api/auth/csrf` antes. Em 403 CSRF_TOKEN_INVALID renovamos e
 *   repetimos uma única vez.
 * - Em dev o Vite faz proxy de /api (mesma origem), então API_BASE fica vazio.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")

const CSRF_COOKIE = "XSRF-TOKEN"
let csrfHeaderName = "X-XSRF-TOKEN"
let csrfFallback: string | null = null

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]
  readonly traceId: string | undefined

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallback: string) {
    super(body?.message ?? fallback)
    this.name = "ApiError"
    this.status = status
    this.code = body?.code ?? (status === 0 ? "NETWORK_ERROR" : "UNKNOWN_ERROR")
    this.fieldErrors = body?.errors ?? []
    this.traceId = body?.traceId
  }
}

/** API inacessível (rede ou backend fora do ar). */
export function isUnavailable(e: unknown): boolean {
  return isApiError(e, "API_UNAVAILABLE")
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code)
}

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: "include" })
  if (!res.ok) throw new ApiError(res.status, await safeJson(res), "Não foi possível iniciar a sessão segura.")
  const body = (await res.json()) as { headerName: string; token: string }
  csrfHeaderName = body.headerName || csrfHeaderName
  csrfFallback = body.token
  return body.token
}

async function csrfToken(): Promise<string> {
  // O cookie é a fonte da verdade (renovado após login); o corpo é só fallback
  // para quando o front roda em outra origem e não enxerga o cookie.
  return readCookie(CSRF_COOKIE) ?? csrfFallback ?? (await fetchCsrf())
}

async function safeJson(res: Response): Promise<Partial<ApiErrorBody> | null> {
  try {
    return (await res.json()) as Partial<ApiErrorBody>
  } catch {
    return null
  }
}

export type Query = Record<string, string | number | boolean | null | undefined | string[]>

export function buildQuery(params?: Query): string {
  if (!params) return ""
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x))
    else sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

/** Listeners de 401 (sessão expirada) — o app limpa a sessão e volta ao login. */
const unauthorizedListeners = new Set<() => void>()
export function onUnauthorized(fn: () => void) {
  unauthorizedListeners.add(fn)
  return () => void unauthorizedListeners.delete(fn)
}

/** Listeners de 403 PASSWORD_CHANGE_REQUIRED — o app manda para /trocar-senha. */
const passwordChangeListeners = new Set<() => void>()
export function onPasswordChangeRequired(fn: () => void) {
  passwordChangeListeners.add(fn)
  return () => void passwordChangeListeners.delete(fn)
}

export async function api<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const method = opts.method ?? "GET"
  const headers: Record<string, string> = { Accept: "application/json" }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json"
  if (method !== "GET") headers[csrfHeaderName] = await csrfToken()

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${buildQuery(opts.query)}`, {
      method,
      headers,
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
      signal: opts.signal ?? null,
    })
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e
    throw new ApiError(0, { code: "API_UNAVAILABLE", message: "Não foi possível conectar ao servidor. Verifique sua conexão." }, "")
  }

  if (res.ok) {
    if (res.status === 204) return undefined as T
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  const body = await safeJson(res)
  // 502/503/504 sem corpo ApiError = API fora do ar (ex.: proxy do Vite sem backend).
  if ([502, 503, 504].includes(res.status) && !body?.code) {
    throw new ApiError(res.status, { code: "API_UNAVAILABLE", message: "O servidor da API está indisponível no momento. Tente novamente em instantes." }, "")
  }
  if (res.status === 403 && body?.code === "CSRF_TOKEN_INVALID" && !retried) {
    csrfFallback = null
    await fetchCsrf()
    return api<T>(path, opts, true)
  }
  const err = new ApiError(res.status, body, `Erro ${res.status} ao acessar o servidor.`)
  if (res.status === 401 && !path.startsWith("/api/auth/")) unauthorizedListeners.forEach((fn) => fn())
  if (res.status === 403 && err.code === "PASSWORD_CHANGE_REQUIRED") passwordChangeListeners.forEach((fn) => fn())
  throw err
}
