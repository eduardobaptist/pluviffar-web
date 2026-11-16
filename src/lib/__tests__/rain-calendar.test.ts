import { describe, expect, it } from "vitest"
import type { SeriesRow } from "../period"
import { groupDaysByMonth, rainLegend, rainLevel } from "../rain-calendar"

const row = (iso: string, mm: number | null): SeriesRow => ({ start: new Date(iso), label: "", mm, readings: mm == null ? 0 : 10, expected: null, coverage: null })

describe("rainLevel", () => {
  it("separa sem dados, zero e faixas", () => {
    expect(rainLevel(null)).toBeNull()
    expect(rainLevel(0)).toBe(0)
    expect(rainLevel(0.2)).toBe(1)
    expect(rainLevel(1)).toBe(2)
    expect(rainLevel(49.9)).toBe(5)
    expect(rainLevel(50)).toBe(6)
  })
  it("legenda tem 7 faixas", () => {
    const l = rainLegend()
    expect(l).toHaveLength(7)
    expect(l[1]!.label).toBe("< 1")
    expect(l[6]!.label).toBe("≥ 50")
  })
})

describe("groupDaysByMonth (fuso de SP, UTC-3)", () => {
  it("alinha pelo dia da semana, deixa vazios os dias fora do período e marca total parcial", () => {
    const months = groupDaysByMonth([row("2026-11-01T03:00:00Z", 0), row("2026-11-02T03:00:00Z", null), row("2026-11-03T03:00:00Z", 12.4)])
    expect(months).toHaveLength(1)
    const m = months[0]!
    expect(m.offset).toBe(0) // 01/11/2026 é domingo
    expect(m.days).toHaveLength(30)
    expect(m.days[3]).toBeUndefined()
    expect(m.total).toEqual({ mm: 12.4, missing: 1, partial: true })
  })
  it("separa meses e usa o dia local do fuso", () => {
    const months = groupDaysByMonth([row("2026-10-31T03:00:00Z", 2), row("2026-11-01T03:00:00Z", 3)])
    expect(months.map((m) => m.key)).toEqual(["2026-10", "2026-11"])
    expect(months[0]!.days[30]!.mm).toBe(2)
  })
  it("sem nenhuma leitura o total é null (nunca 0)", () => {
    expect(groupDaysByMonth([row("2026-11-01T03:00:00Z", null)])[0]!.total.mm).toBeNull()
  })
})
