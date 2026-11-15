import { Link } from "react-router"
import type { ReactNode } from "react"
import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Link to="/" aria-label="PluvIFFar — início">
        <Logo />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
