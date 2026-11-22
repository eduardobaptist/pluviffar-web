import { describe, expect, it } from "vitest"
import type { PrecipitationSeries } from "../api/types"
import { buildCsv, readingsSheet, seriesSheet } from "../export"
import { buildSeriesTable, chunkRange, chunkRangeByBucket } from "../period"

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

describe("chunkRangeByBucket", () => {
  it("corta em início de mês no fuso, sem dividir buckets, e cobre o período inteiro", () => {
    // 2010-01-01 a 2045-01-01 em SP (UTC-3): mais que os 10980 dias por requisição de MONTH
    const r = { from: new Date("2010-01-01T03:00:00Z"), to: new Date("2045-01-01T03:00:00Z") }
    const c = chunkRangeByBucket(r, "MONTH", 10980, "America/Sao_Paulo")
    expect(c.length).toBeGreaterThan(1)
    expect(c[0]!.from).toEqual(r.from)
    expect(c.at(-1)!.to).toEqual(r.to)
    for (let k = 1; k < c.length; k++) {
      expect(c[k]!.from).toEqual(c[k - 1]!.to)
      expect(c[k]!.from.toISOString()).toMatch(/-01T03:00:00\.000Z$/)
    }
  })
})

describe("buildCsv", () => {
  const sheets = [
    {
      name: "A",
      columns: [
        { header: "estacao", type: "string" as const },
        { header: "inicio", type: "date" as const },
        { header: "chuva_mm", type: "number" as const },
      ],
      rows: [
        ["Sede; norte", new Date(Date.UTC(2026, 10, 1)), 1.5],
        ["Sede; norte", new Date(Date.UTC(2026, 10, 2)), null],
      ],
    },
  ]
  it("usa o padrão pt-BR: ; e vírgula decimal, data dd/mm/aaaa, aspas quando necessário e vazio para sem dado", async () => {
    const text = await buildCsv(sheets).text()
    const lines = text.replace(/^\ufeff/, "").trim().split("\r\n")
    expect(lines[0]).toBe("estacao;inicio;chuva_mm")
    expect(lines[1]).toBe('"Sede; norte";01/11/2026;1,5')
    expect(lines[2]).toBe('"Sede; norte";02/11/2026;')
  })
})

describe("seriesSheet", () => {
  const st = { id: "s1", name: "Sede", sendIntervalS: 60 }
  const range = { from: new Date(series.from), to: new Date(series.to) }
  it("colunas técnicas em pt-BR (snake_case, sem acento); sem dado fica vazio", () => {
    const sh = seriesSheet({ stations: [st], bucket: "DAY", range, format: "csv" }, st, [series], "America/Sao_Paulo")
    expect(sh.columns.map((c) => c.header)).toEqual([
      "estacao",
      "inicio",
      "chuva_mm",
      "leituras_recebidas",
      "leituras_esperadas",
      "cobertura_pct",
      "situacao",
    ])
    expect(sh.columns.every((c) => /^[a-z0-9_]+$/.test(c.header))).toBe(true)
    expect(sh.rows.map((r) => r[6])).toEqual(["COMPLETO", "SEM_DADOS", "PARCIAL"])
    expect(sh.rows[1]![2]).toBeNull()
  })
  it("área pública: mesmas colunas, cobertura vazia e situação COBERTURA_DESCONHECIDA", () => {
    const priv = seriesSheet({ stations: [st], bucket: "DAY", range, format: "csv" }, st, [series], "America/Sao_Paulo")
    const sh = seriesSheet({ stations: [st], bucket: "DAY", range, format: "csv", publicMode: true }, st, [series], "America/Sao_Paulo")
    expect(sh.columns.map((c) => c.header)).toEqual(priv.columns.map((c) => c.header))
    expect(sh.rows.every((r) => r[4] === null && r[5] === null)).toBe(true)
    expect(sh.rows.map((r) => r[6])).toEqual(["COBERTURA_DESCONHECIDA", "SEM_DADOS", "COBERTURA_DESCONHECIDA"])
  })
})

describe("readingsSheet", () => {
  const st = { id: "s1", name: "Sede" }
  const r = (measuredAt: string, seq: number, tips = 1) => ({
    measuredAt,
    receivedAt: measuredAt,
    tipsPerMinute: tips,
    precipitationMm: tips * 0.2,
    seq,
  })
  it("ordena, remove duplicadas e conta pacotes perdidos pela sequência (reinício não conta)", () => {
    const sh = readingsSheet(
      st,
      [r("2026-11-01T03:02:00Z", 12), r("2026-11-01T03:00:00Z", 10), r("2026-11-01T03:00:00Z", 10), r("2026-11-01T03:03:00Z", 1)],
      "America/Sao_Paulo",
    )
    expect(sh.columns.every((c) => /^[a-z0-9_]+$/.test(c.header))).toBe(true)
    expect(sh.rows.map((x) => x[5])).toEqual([10, 12, 1])
    expect(sh.rows.map((x) => x[6])).toEqual([0, 1, 0])
  })
  it("CSV com data, hora e segundos no fuso", async () => {
    const sh = readingsSheet(st, [r("2026-11-01T03:00:05Z", 1)], "America/Sao_Paulo")
    const line = (await buildCsv([sh]).text()).trim().split("\r\n")[1]
    expect(line).toBe("Sede;01/11/2026 00:00:05;01/11/2026 00:00:05;1;0,2;1;0")
  })
})

describe("buildXlsx", () => {
  it("gera um .xlsx válido (zip) com aba por estação e aba Sobre", async () => {
    const { buildXlsx } = await import("../export")
    const blob = await buildXlsx(
      [{ name: "Estação 1", columns: [{ header: "inicio", type: "datetime" }, { header: "chuva_mm", type: "number" }], rows: [[new Date(), 0.2]] }],
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
