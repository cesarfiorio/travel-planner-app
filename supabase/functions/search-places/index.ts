import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = [
  'restaurants',
  'attractions',
  'outdoor',
  'nightlife',
  'shopping',
  'accommodation',
] as const;

type Category = (typeof CATEGORIES)[number];

type SearchBody = {
  destination?: string;
  category?: string;
  query?: string;
};

/** Same-city aliases so e.g. Lisboa and Lisbon share one cache key. */
const DESTINATION_CANONICAL = new Map<string, string>([
  ['lisboa', 'lisbon'],
  ['lissabon', 'lisbon'],
]);

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeDestinationKey(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const ascii = stripDiacritics(trimmed);
  return DESTINATION_CANONICAL.get(ascii) ?? ascii;
}

const GOOGLE_TYPE: Record<Category, string> = {
  restaurants: 'restaurant',
  attractions: 'tourist_attraction',
  outdoor: 'park',
  nightlife: 'bar',
  shopping: 'shopping_mall',
  accommodation: 'lodging',
};

const CATEGORY_QUERY_HINT: Record<Category, string> = {
  restaurants: 'restaurants',
  attractions: 'tourist attractions',
  outdoor: 'parks outdoor',
  nightlife: 'nightlife bars',
  shopping: 'shopping',
  accommodation: 'hotels accommodation',
};

type GoogleTextSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  rating?: number;
  price_level?: number;
  photos?: Array<{ photo_reference?: string }>;
  opening_hours?: Record<string, unknown>;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  types?: string[];
};

type GoogleTextSearchResponse = {
  results?: GoogleTextSearchResult[];
  status: string;
  error_message?: string;
};

type DbPlaceRow = {
  id: string;
  google_place_id: string | null;
  name: string;
  category: string | null;
  formatted_address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  rating: number | string | null;
  price_level: number | string | null;
  photos: unknown;
  opening_hours: unknown;
  website: string | null;
  phone: string | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null) {
    return null;
  }
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parsePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is string => typeof x === 'string');
}

function parseOpeningHours(raw: unknown): Record<string, unknown> | null {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function rowToPlace(row: DbPlaceRow, category: Category) {
  return {
    id: row.id,
    google_place_id: row.google_place_id,
    name: row.name,
    category,
    address: row.formatted_address,
    lat: num(row.latitude),
    lng: num(row.longitude),
    rating: num(row.rating),
    price_level: row.price_level == null ? null : Math.round(Number(row.price_level)),
    photos: parsePhotos(row.photos),
    opening_hours: parseOpeningHours(row.opening_hours),
    website: row.website,
    phone: row.phone,
  };
}

function googleResultToUpsertPayload(
  r: GoogleTextSearchResult,
  normDest: string,
  category: Category,
  cachedAt: string,
): Record<string, unknown> | null {
  const placeId = r.place_id?.trim();
  if (!placeId || !r.name?.trim()) {
    return null;
  }
  const photoRefs = (r.photos ?? [])
    .map((p) => p.photo_reference)
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .slice(0, 8);
  return {
    google_place_id: placeId,
    name: r.name.trim(),
    latitude: r.geometry?.location?.lat ?? null,
    longitude: r.geometry?.location?.lng ?? null,
    formatted_address: r.formatted_address ?? null,
    destination_normalized: normDest,
    category,
    cached_at: cachedAt,
    rating: r.rating ?? null,
    price_level: r.price_level ?? null,
    photos: photoRefs,
    opening_hours: r.opening_hours ?? null,
    website: r.website ?? null,
    phone: r.formatted_phone_number ?? r.international_phone_number ?? null,
    metadata: {
      source: 'google_text_search',
      types: r.types ?? [],
    },
    updated_at: cachedAt,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const googleKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!googleKey) {
    return new Response(JSON.stringify({ error: 'google_not_configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Public search proxy: no JWT required. Client may still send Authorization (gateway / habit);
  // cache + Google are accessed only via service role here.

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const destinationRaw = typeof body.destination === 'string' ? body.destination : '';
  const categoryRaw = typeof body.category === 'string' ? body.category : '';
  const optionalQuery = typeof body.query === 'string' ? body.query.trim() : '';

  if (!destinationRaw.trim() || !(CATEGORIES as readonly string[]).includes(categoryRaw)) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const category = categoryRaw as Category;
  const normDest = normalizeDestinationKey(destinationRaw);
  if (!normDest) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const cacheThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: cachedRows, error: cacheErr } = await admin
    .from('places')
    .select(
      'id, google_place_id, name, category, formatted_address, latitude, longitude, rating, price_level, photos, opening_hours, website, phone',
    )
    .eq('destination_normalized', normDest)
    .eq('category', category)
    .not('cached_at', 'is', null)
    .gt('cached_at', cacheThreshold)
    .order('name', { ascending: true });

  if (cacheErr) {
    return new Response(JSON.stringify({ error: 'cache_read_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (cachedRows && cachedRows.length > 0) {
    const ids = cachedRows.map((r) => r.id);
    const { error: bumpErr } = await admin.rpc('routeflow_increment_places_views', { p_ids: ids });
    if (bumpErr) {
      return new Response(JSON.stringify({ error: 'cache_update_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const places = (cachedRows as DbPlaceRow[]).map((row) => rowToPlace(row, category));
    return new Response(JSON.stringify({ places }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const searchParts = [optionalQuery, destinationRaw.trim(), CATEGORY_QUERY_HINT[category]].filter(Boolean);
  const searchQuery = searchParts.join(' ');

  const gUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  gUrl.searchParams.set('query', searchQuery);
  gUrl.searchParams.set('type', GOOGLE_TYPE[category]);
  gUrl.searchParams.set('key', googleKey);

  const gRes = await fetch(gUrl.toString());
  let gJson: GoogleTextSearchResponse;
  try {
    gJson = (await gRes.json()) as GoogleTextSearchResponse;
  } catch {
    console.error('[search-places] Google response was not JSON', gRes.status);
    return new Response(
      JSON.stringify({
        error: 'google_places_failed',
        detail: 'invalid_json',
        message: null,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  if (gJson.status !== 'OK' && gJson.status !== 'ZERO_RESULTS') {
    console.error(
      '[search-places] Google Places Text Search failed:',
      gJson.status,
      gJson.error_message ?? '',
    );
    return new Response(
      JSON.stringify({
        error: 'google_places_failed',
        detail: gJson.status,
        message: gJson.error_message ?? null,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const results = gJson.results ?? [];
  const cachedAt = new Date().toISOString();
  const placesOut: ReturnType<typeof rowToPlace>[] = [];

  for (const r of results) {
    const payload = googleResultToUpsertPayload(r, normDest, category, cachedAt);
    if (!payload) {
      continue;
    }
    const { data: upserted, error: upErr } = await admin
      .from('places')
      .upsert(payload, { onConflict: 'google_place_id' })
      .select(
        'id, google_place_id, name, category, formatted_address, latitude, longitude, rating, price_level, photos, opening_hours, website, phone',
      )
      .single();

    if (upErr || !upserted) {
      continue;
    }
    placesOut.push(rowToPlace(upserted as DbPlaceRow, category));
  }

  return new Response(JSON.stringify({ places: placesOut }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
