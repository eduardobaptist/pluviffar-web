import { describe, expect, it } from "vitest"
import { distanceKm, nearest } from "../geo"

const santaMaria = { lat: -29.6842, lng: -53.8069 }
const portoAlegre = { lat: -30.0346, lng: -51.2177 }

describe("distanceKm", () => {
  it("é zero para o mesmo ponto", () => {
    expect(distanceKm(santaMaria, santaMaria)).toBe(0)
  })
  it("Santa Maria → Porto Alegre ≈ 252 km", () => {
    expect(distanceKm(santaMaria, portoAlegre)).toBeGreaterThan(245)
    expect(distanceKm(santaMaria, portoAlegre)).toBeLessThan(260)
  })
})

describe("nearest", () => {
  const items = [
    { id: "poa", latitude: portoAlegre.lat, longitude: portoAlegre.lng },
    { id: "sm", latitude: santaMaria.lat, longitude: santaMaria.lng },
    { id: "perto", latitude: -29.7, longitude: -53.8 },
  ]
  it("ordena pela distância e respeita o limite", () => {
    const r = nearest(items, santaMaria, 2)
    expect(r.map((x) => x.id)).toEqual(["sm", "perto"])
    expect(r[0]!.distanceKm).toBe(0)
  })
})
