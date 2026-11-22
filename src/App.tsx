import { lazy, Suspense, useEffect, type ComponentType } from "react"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router"
import { RedirectIfAuthed, RequireAdmin, RequireAuth } from "@/components/routing/guards"
import { ErrorBoundary, NotFound } from "@/components/routing/not-found"
import { Spinner } from "@/components/ui/spinner"

/** Cada página vira um chunk separado, baixado só quando a rota é acessada. */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}

const AppLayout = page(() => import("@/pages/app/AppLayout"), "AppLayout")
const DashboardPage = page(() => import("@/pages/app/DashboardPage"), "DashboardPage")
const ExportPage = page(() => import("@/pages/app/ExportPage"), "ExportPage")
const ProfilePage = page(() => import("@/pages/app/ProfilePage"), "ProfilePage")
const GatewayDetailPage = page(() => import("@/pages/app/gateways/DetailPage"), "GatewayDetailPage")
const GatewaysListPage = page(() => import("@/pages/app/gateways/ListPage"), "GatewaysListPage")
const GatewayNewPage = page(() => import("@/pages/app/gateways/NewPage"), "GatewayNewPage")
const StationDetailPage = page(() => import("@/pages/app/stations/DetailPage"), "StationDetailPage")
const StationEditPage = page(() => import("@/pages/app/stations/EditPage"), "StationEditPage")
const StationsListPage = page(() => import("@/pages/app/stations/ListPage"), "StationsListPage")
const StationNewPage = page(() => import("@/pages/app/stations/NewPage"), "StationNewPage")
const UserDetailPage = page(() => import("@/pages/app/users/DetailPage"), "UserDetailPage")
const UsersListPage = page(() => import("@/pages/app/users/ListPage"), "UsersListPage")
const UserNewPage = page(() => import("@/pages/app/users/NewPage"), "UserNewPage")
const ChangePasswordPage = page(() => import("@/pages/auth/ChangePasswordPage"), "ChangePasswordPage")
const LoginPage = page(() => import("@/pages/auth/LoginPage"), "LoginPage")
const HomePage = page(() => import("@/pages/public/HomePage"), "HomePage")
const MapPage = page(() => import("@/pages/public/MapPage"), "MapPage")
const PublicLayout = page(() => import("@/pages/public/PublicLayout"), "PublicLayout")
const PublicStationDetailPage = page(() => import("@/pages/public/StationDetailPage"), "PublicStationDetailPage")
const PublicStationsPage = page(() => import("@/pages/public/StationsPage"), "PublicStationsPage")

/** Volta ao topo ao trocar de página (o BrowserRouter não faz isso sozinho). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    // Com âncora (ex.: /#como-funciona), quem rola é a própria página.
    if (!hash) window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
  return null
}

export function App() {
  const { pathname } = useLocation()
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={<div className="flex min-h-svh items-center justify-center text-muted-foreground"><Spinner className="size-6" /></div>}>
        <Routes>
          {/* Área pública: layout com cabeçalho/menu, sem segmento na URL */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="mapa" element={<MapPage />} />
            <Route path="estacoes" element={<PublicStationsPage />} />
            <Route path="estacoes/:id" element={<PublicStationDetailPage />} />
            {/* "Sobre" virou a seção "Como funciona" da home */}
            <Route path="sobre" element={<Navigate to={{ pathname: "/", hash: "como-funciona" }} replace />} />
          </Route>

          {/* Autenticação */}
          <Route path="entrar" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="trocar-senha" element={<RequireAuth allowPasswordChange><ChangePasswordPage /></RequireAuth>} />

          {/* Área logada (PRODUCER e ADMIN): layout sem segmento na URL */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="painel" element={<DashboardPage />} />
            <Route path="minhas-estacoes">
              <Route index element={<StationsListPage />} />
              <Route path="novo" element={<StationNewPage />} />
              <Route path=":id" element={<StationDetailPage />} />
              <Route path=":id/editar" element={<StationEditPage />} />
            </Route>
            <Route path="gateways">
              <Route index element={<GatewaysListPage />} />
              <Route path="novo" element={<GatewayNewPage />} />
              <Route path=":id" element={<GatewayDetailPage />} />
            </Route>
            <Route path="exportar" element={<ExportPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            {/* Somente ADMIN */}
            <Route path="usuarios" element={<RequireAdmin><Outlet /></RequireAdmin>}>
              <Route index element={<UsersListPage />} />
              <Route path="novo" element={<UserNewPage />} />
              <Route path=":id" element={<UserDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
