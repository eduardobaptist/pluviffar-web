import { Link } from "react-router"
import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { QueryError } from "@/components/common/query-error"
import { useFetch } from "@/hooks/use-fetch"
import { publicApi } from "@/lib/api/endpoints"
import { fmt24h, fmtDateTime } from "@/lib/format"

export function PublicStationsPage() {
  const q = useFetch(() => publicApi.list(), [], { intervalMs: 5 * 60_000 })
  const [term, setTerm] = useState("")
  const rows = useMemo(() => (q.data ?? []).filter((s) => s.name.toLowerCase().includes(term.toLowerCase())), [q.data, term])
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="Estações públicas"
        description="Chuva das últimas 24 h. Abra uma estação para ver o histórico e exportar os dados."
        actions={
          <InputGroup className="w-64">
            <InputGroupInput placeholder="Buscar…" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Buscar estação" />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        }
      />
      {q.error ? (
        <QueryError error={q.error} onRetry={q.reload} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estação</TableHead>
                <TableHead className="text-right">Últimas 24 h</TableHead>
                <TableHead>Última leitura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!q.data &&
                [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-5" />
                    </TableCell>
                  </TableRow>
                ))}
              {!!q.data && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Nenhuma estação encontrada.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link to={`/estacoes/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt24h(s.last24hMm, s.lastReadingAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDateTime(s.lastReadingAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
