import { useNavigate } from "react-router"
import { useEffect, useRef, useState } from "react"
import type * as Leaflet from "leaflet"
import { fmtMm } from "@/lib/format"
import { rainLevel } from "@/lib/rain-calendar"
import { cn } from "@/lib/utils"
import { RainLegend } from "./rain-legend"

export interface MapPoint {
  id: string
  name: string
  lat: number
  lng: number
  /** Linhas extras do popup (texto puro — nunca HTML). */
  info?: string[]
  /** Rota de detalhe; sem ela o popup não tem link. */
  href?: "public" | "private"
  /**
   * Chuva das últimas 24 h, para colorir o ponto com a escala do calendário pluviométrico.
   * `null` = sem dados (nunca 0 mm); `undefined` = ponto neutro (sem escala, ex.: prévia do cadastro).
   */
  mm?: number | null
}

const DEFAULT_CENTER: [number, number] = [-29.5, -54.5] // RS

const DOT = "display:block;width:18px;height:18px;border-radius:9999px;border:3px solid var(--background);box-shadow:0 1px 4px rgb(0 0 0/.35)"

/** Estilo do ponto: mesma escala de cores do calendário (tokens `--rain-1…6`). */
function dotStyle(mm: number | null | undefined): string {
  if (mm === undefined) return `${DOT};background:var(--success)`
  const level = rainLevel(mm)
  if (level == null)
    return `${DOT};background:repeating-linear-gradient(135deg,var(--muted-foreground) 0 2px,var(--muted) 2px 4px)`
  if (level === 0) return `${DOT};background:var(--card);box-shadow:inset 0 0 0 1.5px var(--muted-foreground),0 1px 4px rgb(0 0 0/.35)`
  return `${DOT};background:var(--rain-${level})`
}

/** Mapa Leaflet + OpenStreetMap. Carregado sob demanda (leaflet é client-only). */
export function StationMap({ points, className, zoom = 11 }: { points: MapPoint[]; className?: string; zoom?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [leaflet, setLeaflet] = useState<{ L: typeof Leaflet; map: Leaflet.Map; layer: Leaflet.LayerGroup } | null>(null)
  const fittedKey = useRef<string | null>(null)

  // Cria o mapa uma vez; os pontos são atualizados sem recriá-lo (a vista não "pula" ao chegar a chuva).
  useEffect(() => {
    let map: Leaflet.Map | undefined
    let cancelled = false
    void import("leaflet").then((L) => {
      if (cancelled || !ref.current) return
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 6)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)
      setLeaflet({ L, map, layer: L.layerGroup().addTo(map) })
    })
    return () => {
      cancelled = true
      map?.remove()
      fittedKey.current = null
      setLeaflet(null)
    }
  }, [])

  useEffect(() => {
    if (!leaflet) return
    const { L, map, layer } = leaflet
    layer.clearLayers()
    const bounds: [number, number][] = []
    for (const p of points) {
      const el = document.createElement("div")
      const strong = document.createElement("strong")
      strong.textContent = p.name
      el.appendChild(strong)
      for (const line of p.info ?? []) {
        const d = document.createElement("div")
        d.textContent = line
        el.appendChild(d)
      }
      if (p.href) {
        const a = document.createElement("a")
        a.href = "#"
        a.textContent = "Ver detalhes →"
        a.style.display = "inline-block"
        a.style.marginTop = "4px"
        a.addEventListener("click", (e) => {
          e.preventDefault()
          void navigate(p.href === "public" ? `/estacoes/${p.id}` : `/minhas-estacoes/${p.id}`)
        })
        el.appendChild(a)
      }
      const icon = L.divIcon({ className: "", html: `<span style="${dotStyle(p.mm)}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] })
      const title = p.mm === undefined ? p.name : `${p.name} — 24 h: ${fmtMm(p.mm)}`
      L.marker([p.lat, p.lng], { icon, title }).addTo(layer).bindPopup(el)
      bounds.push([p.lat, p.lng])
    }
    // Reenquadra só quando o conjunto de coordenadas muda (filtro, outra estação), não ao chegar a chuva.
    const key = bounds.map((b) => b.join(",")).join(";")
    if (key === fittedKey.current) return
    fittedKey.current = key
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    else if (bounds.length === 1) map.setView(bounds[0]!, zoom)
  }, [leaflet, points, navigate, zoom])

  const colored = points.some((p) => p.mm !== undefined)
  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className={cn("h-[420px] w-full overflow-hidden rounded-xl border", className)} role="region" aria-label="Mapa de estações" />
      {colored && <RainLegend title="Chuva nas últimas 24 h (mm)" round />}
    </div>
  )
}
