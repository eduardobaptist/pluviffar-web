import { useCallback, useEffect, useState } from "react"
import type { LatLng } from "@/lib/geo"

export type GeoState =
  | { status: "pending" }
  | { status: "granted"; coords: LatLng }
  /** denied: usuário negou; unavailable: navegador sem suporte/contexto inseguro; error: timeout ou posição indisponível. */
  | { status: "denied" | "unavailable" | "error" }

const supported = () => typeof navigator !== "undefined" && "geolocation" in navigator

/** Pede a localização assim que monta (o navegador mostra o prompt de permissão). `retry()` pede de novo. */
export function useGeolocation(): GeoState & { retry: () => void } {
  const [state, setState] = useState<GeoState>(() => (supported() ? { status: "pending" } : { status: "unavailable" }))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supported()) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!cancelled) setState({ status: "granted", coords: { lat: p.coords.latitude, lng: p.coords.longitude } })
      },
      (e) => {
        if (!cancelled) setState({ status: e.code === e.PERMISSION_DENIED ? "denied" : "error" })
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    if (!supported()) return
    setState({ status: "pending" })
    setAttempt((a) => a + 1)
  }, [])

  return { ...state, retry }
}
