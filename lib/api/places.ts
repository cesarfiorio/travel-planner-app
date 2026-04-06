import { FunctionsHttpError } from '@supabase/supabase-js';

import { hasSupabaseEnv, supabase } from '../supabase';

import type { Place, PlaceCategory } from '../../types/places';

export class PlacesApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'PlacesApiError';
  }
}

type SearchPlacesResponse = { places?: Place[]; error?: string };

function isPlaceCategory(value: string): value is PlaceCategory {
  return (
    value === 'restaurants' ||
    value === 'attractions' ||
    value === 'outdoor' ||
    value === 'nightlife' ||
    value === 'shopping' ||
    value === 'accommodation'
  );
}

function assertPlacesPayload(data: unknown): Place[] {
  if (!data || typeof data !== 'object') {
    throw new PlacesApiError('Invalid response');
  }
  const obj = data as SearchPlacesResponse;
  if (typeof obj.error === 'string' && obj.error.length > 0) {
    throw new PlacesApiError(obj.error, obj.error);
  }
  if (!Array.isArray(obj.places)) {
    throw new PlacesApiError('Invalid response');
  }
  return obj.places.map((p) => {
    if (!p || typeof p !== 'object') {
      throw new PlacesApiError('Invalid place entry');
    }
    const row = p as unknown as Record<string, unknown>;
    const cat = typeof row.category === 'string' ? row.category : '';
    if (!isPlaceCategory(cat)) {
      throw new PlacesApiError('Invalid place category');
    }
    const photos = row.photos;
    if (!Array.isArray(photos) || !photos.every((x) => typeof x === 'string')) {
      throw new PlacesApiError('Invalid photos field');
    }
    return {
      id: String(row.id),
      google_place_id: row.google_place_id == null ? null : String(row.google_place_id),
      name: String(row.name),
      category: cat,
      address: row.address == null ? null : String(row.address),
      lat: typeof row.lat === 'number' ? row.lat : row.lat == null ? null : Number(row.lat),
      lng: typeof row.lng === 'number' ? row.lng : row.lng == null ? null : Number(row.lng),
      rating: typeof row.rating === 'number' ? row.rating : row.rating == null ? null : Number(row.rating),
      user_ratings_total: (() => {
        const v = row.user_ratings_total;
        const n = typeof v === 'number' ? v : v == null ? NaN : Number(v);
        return Number.isFinite(n) ? Math.round(n) : null;
      })(),
      price_level:
        typeof row.price_level === 'number' ? row.price_level : row.price_level == null ? null : Number(row.price_level),
      photos,
      opening_hours:
        row.opening_hours != null && typeof row.opening_hours === 'object' && !Array.isArray(row.opening_hours)
          ? (row.opening_hours as Record<string, unknown>)
          : null,
      website: row.website == null ? null : String(row.website),
      phone: row.phone == null ? null : String(row.phone),
    };
  });
}

/**
 * Search cached / Google Places via Edge Function. API key stays on the server.
 *
 * Supabase’s Edge gateway with **Verify JWT with legacy secret** ON validates `Authorization`
 * using the **legacy JWT secret**. User session tokens are often **ES256** and get **401** there.
 * This handler is public (service role inside), so we send **anon JWT** as both `Authorization`
 * and `apikey`—same as the dashboard cURL—while still requiring a signed-in session in the app.
 */
export async function searchPlaces(destination: string, category: PlaceCategory, query?: string): Promise<Place[]> {
  if (!hasSupabaseEnv || !supabase) {
    throw new PlacesApiError('Supabase is not configured');
  }
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new PlacesApiError('Sign in required to search places.');
  }

  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const anon = anonKey.trim();
  if (!anon) {
    throw new PlacesApiError('Supabase is not configured');
  }

  const { data, error } = await supabase.functions.invoke<SearchPlacesResponse>('search-places', {
    body: {
      destination,
      category,
      ...(query !== undefined && query !== '' ? { query } : {}),
    },
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
  });
  if (error) {
    let message = error.message ?? 'Request failed';
    if (error instanceof FunctionsHttpError) {
      try {
        const errBody = (await error.context.json()) as {
          error?: string;
          detail?: string;
          message?: string | null;
        };
        if (typeof errBody?.error === 'string') {
          const extra =
            typeof errBody.detail === 'string'
              ? `${errBody.error}: ${errBody.detail}${errBody.message ? ` — ${errBody.message}` : ''}`
              : errBody.error;
          message = `${message} (${extra})`;
        }
      } catch {
        /* ignore */
      }
    }
    throw new PlacesApiError(message, error.name);
  }
  return assertPlacesPayload(data);
}
