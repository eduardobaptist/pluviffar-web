import { useMe } from "@/hooks/use-auth"
import { AdminDashboard } from "./dashboard/AdminDashboard"
import { ProducerDashboard } from "./dashboard/ProducerDashboard"

/** `/painel`: visão da rede para o ADMIN, visão da estação (favorita primeiro) para o produtor. */
export function DashboardPage() {
  const me = useMe()
  return me.role === "ADMIN" ? <AdminDashboard /> : <ProducerDashboard />
}
