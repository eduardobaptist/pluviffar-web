import { cn } from "@/lib/utils"

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src="/logo.svg" alt="" className="h-8 w-auto" />
      {withText && (
        <span className="font-heading text-lg font-semibold tracking-tight">
          Pluv<span className="text-success">IFF</span>ar
        </span>
      )}
    </span>
  )
}
