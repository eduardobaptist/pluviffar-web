import { Suspense } from "react"
import { Outlet } from "react-router"
import { Spinner } from "@/components/ui/spinner"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useMe } from "@/hooks/use-auth"

/** Área logada (PRODUCER e ADMIN). A guarda fica em `<RequireAuth>` (App.tsx). */
export function AppLayout() {
  const me = useMe()
  return (
    <SidebarProvider>
      <AppSidebar me={me} />
      <SidebarInset>
        {/* Cabeçalho e conteúdo com o mesmo padding horizontal (px-4 / md:px-6) para alinhar as bordas */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex w-full flex-1 flex-col gap-6 p-4 md:p-6">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
                <Spinner className="size-6" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
