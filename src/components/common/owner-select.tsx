import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFetch } from "@/hooks/use-fetch"
import { usersApi } from "@/lib/api/endpoints"

export const ALL = "__all__"

/** Select de produtor (ADMIN). `allowAll` adiciona a opção "Todos" (filtros). */
export function OwnerSelect({
  value,
  onChange,
  id,
  invalid,
  allowAll,
  className,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  invalid?: boolean
  allowAll?: boolean
  className?: string
}) {
  // Produtores ativos (até 100 — ver "Falta na API").
  const q = useFetch(() => usersApi.list({ role: "PRODUCER", active: true, size: 100, sort: "name,asc" }), [])
  return (
    <Select value={value || (allowAll ? ALL : "")} onValueChange={onChange} disabled={!q.data}>
      <SelectTrigger id={id} aria-invalid={invalid} className={className ?? "w-full"}>
        <SelectValue placeholder={!q.data ? "Carregando…" : "Escolha o produtor"} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL}>Todos os produtores</SelectItem>}
        {q.data?.content.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name} <span className="text-muted-foreground">· {u.email}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
