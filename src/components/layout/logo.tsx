import { cn } from "@/lib/utils"

/**
 * Logo do PluvIFFar. Com `withText`, usa a imagem horizontal (gota + nome em curvas, com variante para o tema
 * escuro); sem texto, só a gota. A gota solta (`img` filho direto) fica oculta enquanto o nome aparece — o
 * menu lateral recolhido inverte isso com `[&>span]:hidden [&>img]:block`.
 */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  const mark = <img src="/logo-mark.svg" alt="PluvIFFar" className={cn("h-8 w-auto", withText && "hidden")} />
  return (
    <span className={cn("inline-flex items-center", className)}>
      {mark}
      {withText && (
        <span className="inline-flex">
          <img src="/logo-header.svg" alt="PluvIFFar" className="h-8 w-auto dark:hidden" />
          <img src="/logo-header-dark.svg" alt="PluvIFFar" className="hidden h-8 w-auto dark:block" />
        </span>
      )}
    </span>
  )
}
