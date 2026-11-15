import { Search } from "lucide-react"
import { useEffect, useState } from "react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useDebounced } from "@/hooks/use-debounced"
import { cn } from "@/lib/utils"

/** Campo de busca com debounce — sincroniza com o search param da rota. */
export function SearchInput({ value, onChange, placeholder = "Buscar…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value)
  const debounced = useDebounced(text)
  useEffect(() => {
    if (debounced !== value) onChange(debounced)
  }, [debounced])
  useEffect(() => setText(value), [value])
  return (
    <InputGroup className={cn("w-full sm:w-64", className)}>
      <InputGroupInput placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} aria-label={placeholder} />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
  )
}
