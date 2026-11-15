import { describe, expect, it } from "vitest"
import type { PrecipitationSeries } from "../api/types"
import { buildCsv } from "../export"
import { buildSeriesTable, chunkRange } from "../period"

const series: PrecipitationSeries = {
  stationId: "s1",
  bucket: "DAY",
  timezone: "America/Sao_Paulo",
  // 3 dias inteiros no fuso de SP (UTC-3)
  from: "2026-11-01T03:00:00Z",
  to: "2026-11-04T03:00:00Z",
  totalMm: 12.4,
  points: [
    { bucketStart: "2026-11-01T03:00:00Z", precipitationMm: 0, readingsCount: 1440 },
    { bucketStart: "2026-11-03T03:00:00Z", precipitationMm: 12.4, readingsCount: 720 },
  ],
}

describe("buildSeriesTable", () => {
  it("preenche buckets ausentes como sem dados (null), nunca 0 mm", () => {
    const t = buildSeriesTable(series, 60)
    expect(t.rows).toHaveLength(3)
    expect(t.rows[1]!.mm).toBeNull()
    expect(t.rows[1]!.readings).toBe(0)
    expect(t.rows[0]!.mm).toBe(0)
    expect(t.bucketsWithData).toBe(2)
  })

  it("estima a cobertura pelo intervalo de envio", () => {
    const t = buildSeriesTable(series, 60)
    expect(t.rows[0]!.coverage).toBe(100)
    expect(t.rows[1]!.coverage).toBe(0)
    expect(t.rows[2]!.coverage).toBe(50)
    expect(t.coverage).toBeCloseTo(50)
  })

  it("sem intervalo de envio a cobertura é desconhecida (null)", () => {
    const t = buildSeriesTable(series, null)
    expect(t.coverage).toBeNull()
    expect(t.rows.every((r) => r.coverage === null)).toBe(true)
  })
})

describe("chunkRange", () => {
  it("fatia em janelas de no máximo N dias", () => {
    const r = chunkRange({ from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-11T00:00:00Z") }, 4)
    expect(r).toHaveLength(3)
    expect(r[2]!.to.toISOString()).toBe("2026-01-11T00:00:00.000Z")
  })
})

describe("buildCsv", () => {
  const sheets = [
    {
      name: "A",
      columns: [
        { header: "estacao", type: "string" as const },
        { header: "chuva_mm", type: "number" as const },
      ],
      rows: [
        ["Sede; norte", 1.5],
        ["Sede; norte", null],
      ],
    },
  ]
  it("pt-BR usa ; e vírgula decimal, com aspas quando necessário e vazio para sem dado", async () => {
    const text = await buildCsv(sheets, "br").text()
    const lines = text.replace(/^﻿/, "").trim().split("\r\n")
    expect(lines[0]).toBe("estacao;chuva_mm")
    expect(lines[1]).toBe('"Sede; norte";1,5')
    expect(lines[2]).toBe('"Sede; norte";')
  })
  it("internacional usa , e ponto decimal", async () => {
    const text = await buildCsv(sheets, "intl").text()
    expect(text).toContain("Sede; norte,1.5")
  })
})

describe("buildXlsx", () => {
  it("gera um .xlsx válido (zip) com aba por estação e aba Sobre", async () => {
    const { buildXlsx } = await import("../export")
    const blob = await buildXlsx(
      [{ name: "Estação 1", columns: [{ header: "medido_em", type: "datetime" }, { header: "chuva_mm", type: "number" }], rows: [[new Date(), 0.2]] }],
      [["Fuso", "America/Sao_Paulo"]],
    )
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes[0]).toBe(0x50) // "PK"
    expect(bytes[1]).toBe(0x4b)
    const ExcelJS = (await import("exceljs")).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(bytes.buffer as ArrayBuffer)
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Estação 1", "Sobre"])
  })
})
