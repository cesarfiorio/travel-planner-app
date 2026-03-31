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
  if (!geojson || typeof geojson !== 'object') {
    return [];
  }
  const f = (geojson as { features?: unknown }).features;
  if (!Array.isArray(f)) {
    return [];
  }
  const names: string[] = [];
  for (const feat of f) {
    if (feat && typeof feat === 'object' && 'properties' in feat) {
      const p = (feat as { properties?: { name?: string } }).properties;
      if (p?.name) {
        names.push(p.name);
      }
    }
  }
  return names;
}
