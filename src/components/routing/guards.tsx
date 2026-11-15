import type { ReactNode } from "react"
import { Navigate, useLocation, useSearchParams } from "react-router"
import { Spinner } from "@/components/ui/spinner"
import { QueryError } from "@/components/common/query-error"
import { useAuth } from "@/hooks/use-auth"

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center text-muted-foreground">
      <Spinner className="size-6" />
    </div>
  )
}

/**
 * Área logada: exige sessão e senha já trocada.
 * Só melhora a navegação — quem protege os dados é a API (401/403).
 */
export function RequireAuth({ children, allowPasswordChange = false }: { children: ReactNode; allowPasswordChange?: boolean }) {
  const { me, ready, error, refresh } = useAuth()
  const location = useLocation()
  if (!ready) return <FullPageSpinner />
  if (!me && error) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <QueryError error={error} onRetry={() => void refresh()} title="Não foi possível verificar a sessão" />
      </div>
    )
  }
  if (!me) return <Navigate to={`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (me.mustChangePassword && !allowPasswordChange) return <Navigate to="/trocar-senha" replace />
  return children
}

/** Somente ADMIN (usar dentro de `<RequireAuth>`). */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { me } = useAuth()
  if (me?.role !== "ADMIN") return <Navigate to="/painel" replace />
  return children
}

/** Só caminhos internos (evita open redirect via `//host` ou `/\\host`) e nunca de volta ao login. */
function safeRedirect(back: string | null) {
  if (!back || !back.startsWith("/") || back.startsWith("//") || back.startsWith("/\\") || back.startsWith("/entrar")) return null
  return back
}

/** Tela de login: quem já está logado vai para o destino (`?redirect=/minhas-estacoes/...`) ou para `/painel`. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { me, ready } = useAuth()
  const [sp] = useSearchParams()
  if (!ready) return <FullPageSpinner />
  if (me) {
    const to = me.mustChangePassword ? "/trocar-senha" : (safeRedirect(sp.get("redirect")) ?? "/painel")
    return <Navigate to={to} replace />
  }
  return children
}
