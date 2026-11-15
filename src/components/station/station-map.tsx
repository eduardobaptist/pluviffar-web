import { useNavigate } from "react-router"
import { useEffect, useRef } from "react"
import type * as Leaflet from "leaflet"
import { cn } from "@/lib/utils"

export interface MapPoint {
  id: string
  name: string
  lat: number
  lng: number
  /** Linhas extras do popup (texto puro — nunca HTML). */
  info?: string[]
  /** Rota de detalhe; sem ela o popup não tem link. */
  href?: "public" | "private"
}

const DEFAULT_CENTER: [number, number] = [-29.5, -54.5] // RS

/** Mapa Leaflet + OpenStreetMap. Carregado sob demanda (leaflet é client-only). */
export function StationMap({ points, className, zoom = 11 }: { points: MapPoint[]; className?: string; zoom?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
      const icon = L.divIcon({
        className: "",
        html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:var(--success);border:3px solid var(--background);box-shadow:0 1px 4px rgb(0 0 0/.35)"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
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
        L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(map).bindPopup(el)
        bounds.push([p.lat, p.lng])
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
      else if (bounds.length === 1) map.setView(bounds[0]!, zoom)
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [points, navigate, zoom])

  return <div ref={ref} className={cn("h-[420px] w-full overflow-hidden rounded-xl border", className)} role="region" aria-label="Mapa de estações" />
}
