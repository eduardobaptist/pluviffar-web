export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

/** Distância em linha reta (haversine), em km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Os `limit` itens mais próximos de `origin`, do mais perto para o mais longe, com a distância. */
export function nearest<T extends { latitude: number; longitude: number }>(items: T[], origin: LatLng, limit: number): (T & { distanceKm: number })[] {
  return items
    .map((it) => ({ ...it, distanceKm: distanceKm(origin, { lat: it.latitude, lng: it.longitude }) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}
