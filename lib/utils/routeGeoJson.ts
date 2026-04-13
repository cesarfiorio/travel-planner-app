import type { Json } from '../supabase/types';

export type PlacePin = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

/** GeoJSON FeatureCollection for community route storage. */
export function buildRouteGeoJson(places: PlacePin[]): Json {
  const features = places
    .filter((p) => p.latitude != null && p.longitude != null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.longitude as number, p.latitude as number],
      },
      properties: { id: p.id, name: p.name },
    }));
  return {
    type: 'FeatureCollection',
    features,
  };
}

export function parseRoutePlaceNames(geojson: Json | null): string[] {
  return parseRoutePins(geojson).map((p) => p.name);
}

/** Ordered pins from community route GeoJSON (Point features). */
export function parseRoutePins(geojson: Json | null): PlacePin[] {
  if (!geojson || typeof geojson !== 'object') {
    return [];
  }
  const f = (geojson as { features?: unknown }).features;
  if (!Array.isArray(f)) {
    return [];
  }
  const pins: PlacePin[] = [];
  for (const feat of f) {
    if (!feat || typeof feat !== 'object' || !('properties' in feat)) {
      continue;
    }
    const p = (feat as { properties?: { id?: string; name?: string } }).properties;
    const id = p?.id?.trim();
    const name = p?.name?.trim();
    if (!id || !name) {
      continue;
    }
    let latitude: number | null = null;
    let longitude: number | null = null;
    const geom = (feat as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (geom?.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
      const lon = Number(geom.coordinates[0]);
      const lat = Number(geom.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        latitude = lat;
        longitude = lon;
      }
    }
    pins.push({ id, name, latitude, longitude });
  }
  return pins;
}

/** Split ordered pins into day buckets (even sizes, last days may be shorter). */
export function splitPinsAcrossDays<T>(items: T[], dayCount: number): T[][] {
  if (items.length === 0) {
    return [];
  }
  const d = Math.max(1, Math.min(dayCount, Math.max(1, items.length)));
  const chunks: T[][] = [];
  const n = items.length;
  const base = Math.floor(n / d);
  let rem = n % d;
  let idx = 0;
  for (let di = 0; di < d; di++) {
    const size = base + (rem > 0 ? 1 : 0);
    if (rem > 0) {
      rem -= 1;
    }
    chunks.push(items.slice(idx, idx + size));
    idx += size;
  }
  return chunks;
}
