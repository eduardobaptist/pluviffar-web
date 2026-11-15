import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { ptBR } from "react-day-picker/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Intervalo de dias de calendário (inclusivo). Datas futuras desabilitadas. */
export function DateRangePicker({
  value,
  onChange,
  id,
  invalid,
  className,
}: {
  value: { from?: Date | undefined; to?: Date | undefined }
  onChange: (v: { from?: Date | undefined; to?: Date | undefined }) => void
  id?: string
  invalid?: boolean
  className?: string
}) {
  const label =
    value.from && value.to
      ? `${format(value.from, "dd/MM/yyyy")} – ${format(value.to, "dd/MM/yyyy")}`
      : value.from
        ? `${format(value.from, "dd/MM/yyyy")} – …`
        : "Escolha o período"
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-invalid={invalid}
          className={cn("justify-start font-normal", !value.from && "text-muted-foreground", className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={ptBR}
          numberOfMonths={2}
          captionLayout="dropdown"
          defaultMonth={value.from}
          selected={value as DateRange}
          onSelect={(r) => onChange({ from: r?.from, to: r?.to })}
          disabled={{ after: new Date() }}
          startMonth={new Date(2020, 0)}
          endMonth={new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
