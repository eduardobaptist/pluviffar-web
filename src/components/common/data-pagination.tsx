import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

function pages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const set = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | "…")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…")
    out.push(p)
  })
  return out
}

/** Paginação 0-based (como a API). */
export function DataPagination({
  page,
  totalPages,
  totalElements,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalElements?: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1)
    return totalElements != null ? <p className="text-sm text-muted-foreground">{totalElements} registro(s)</p> : null
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (p >= 0 && p < totalPages && p !== page) onPageChange(p)
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {totalElements != null && <p className="text-sm text-muted-foreground">{totalElements} registro(s)</p>}
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" text="Anterior" onClick={go(page - 1)} aria-disabled={page === 0} className={page === 0 ? "pointer-events-none opacity-50" : ""} />
          </PaginationItem>
          {pages(page, totalPages).map((p, i) =>
            p === "…" ? (
              <PaginationItem key={`e${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink href="#" isActive={p === page} onClick={go(p)}>
                  {p + 1}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext href="#" text="Próxima" onClick={go(page + 1)} aria-disabled={page >= totalPages - 1} className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : ""} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
