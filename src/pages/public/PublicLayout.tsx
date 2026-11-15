import { Menu } from "lucide-react"
import { Suspense, useState } from "react"
import { Link, NavLink, Outlet } from "react-router"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useAuth } from "@/hooks/use-auth"

const NAV = [
  { to: "/", label: "Início" },
  { to: "/mapa", label: "Mapa" },
  { to: "/estacoes", label: "Estações" },
  { to: "/comparativo", label: "Comparativo" },
  { to: "/sobre", label: "Sobre" },
] as const

function NavLinks({ onNavigate, vertical = false }: { onNavigate?: () => void; vertical?: boolean }) {
  return (
    <>
      {NAV.map((n) => (
        <Button key={n.to} asChild variant="ghost" className={vertical ? "justify-start" : undefined}>
          <NavLink to={n.to} end={n.to === "/"} onClick={onNavigate} className="text-muted-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground">
            {n.label}
          </NavLink>
        </Button>
      ))}
    </>
  )
}

export function PublicLayout() {
  const { me } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                <NavLinks vertical onNavigate={() => setOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" aria-label="PluvIFFar — início">
            <Logo />
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <NavLinks />
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {me ? (
              <Button asChild>
                <Link to="/painel">Minha área</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/entrar">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
                <Spinner className="size-6" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:px-8">
          <span>PluvIFFar · Rede pluviométrica do Instituto Federal Farroupilha</span>
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <span>Mapas © OpenStreetMap</span>
        </div>
      </footer>
    </div>
  )
}
