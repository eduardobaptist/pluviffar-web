import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import { fetchCsrf, onPasswordChangeRequired, onUnauthorized } from "@/lib/api/client"
import { authApi } from "@/lib/api/endpoints"
import type { CurrentUser, LoginRequest } from "@/lib/api/types"

interface AuthContextValue {
  /** Usuário logado; `null` sem sessão. */
  me: CurrentUser | null
  /** A primeira verificação de sessão (`GET /api/auth/me`) já terminou. */
  ready: boolean
  /** Verificação de sessão em andamento. */
  loading: boolean
  /** Erro da última verificação (ex.: API fora do ar); 401 não é erro, vira `me = null`. */
  error: unknown
  refresh: () => Promise<void>
  login: (body: LoginRequest) => Promise<CurrentUser>
  logout: () => Promise<void>
  setMe: (me: CurrentUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Sessão do usuário. Precisa ficar dentro do `<BrowserRouter>` (usa navegação). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setMe(await authApi.me())
      setError(null)
    } catch (e) {
      setMe(null)
      setError(e)
    } finally {
      setLoading(false)
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Sessão expirada (401 fora de /api/auth) → volta ao login preservando o destino.
  const here = location.pathname + location.search
  useEffect(
    () =>
      onUnauthorized(() => {
        setMe(null)
        if (!location.pathname.startsWith("/entrar")) navigate(`/entrar?redirect=${encodeURIComponent(here)}`)
      }),
    [navigate, here, location.pathname],
  )

  useEffect(() => onPasswordChangeRequired(() => navigate("/trocar-senha")), [navigate])

  const login = useCallback(async (body: LoginRequest) => {
    await fetchCsrf() // garante o cookie XSRF-TOKEN antes do primeiro POST
    const user = await authApi.login(body)
    setMe(user)
    setError(null)
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Mesmo com erro, a sessão local é encerrada.
    }
    setMe(null)
    navigate("/")
    toast.success("Sessão encerrada.")
  }, [navigate])

  return <AuthContext.Provider value={{ me, ready, loading, error, refresh, login, logout, setMe }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.")
  return ctx
}

/** Usuário logado em páginas protegidas por `<RequireAuth>` (nunca `null` ali). */
export function useMe(): CurrentUser {
  const { me } = useAuth()
  if (!me) throw new Error("useMe usado fora de uma rota protegida.")
  return me
}
