/**
 * Free destination hero images for Community when no cover_photo_url is stored.
 * 1) Optional: Unsplash Search API if EXPO_PUBLIC_UNSPLASH_ACCESS_KEY is set (see Unsplash API guidelines).
 * 2) Default: Wikimedia Commons file search (no key; follow https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).
 */

const WIKIMEDIA_USER_AGENT = 'RouteFlow/1.0 (community destination covers; React Native)';

type WmQueryJson = {
  query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> };
};

type UnsplashSearchJson = {
  results?: { urls?: { regular?: string } }[];
};

async function tryWikimediaSearch(search: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: search,
    gsrnamespace: '6',
    gsrlimit: '1',
    prop: 'imageinfo',
    iiprop: 'url|thumburl',
    iiurlwidth: '1200',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: {
      'User-Agent': WIKIMEDIA_USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as WmQueryJson;
  const pages = json.query?.pages;
  if (!pages) {
    return null;
  }
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  return info?.thumburl || info?.url || null;
}

async function fetchFromUnsplash(destination: string, clientId: string): Promise<string | null> {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination)}` +
    `&per_page=1&orientation=landscape&client_id=${encodeURIComponent(clientId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as UnsplashSearchJson;
  const u = json.results?.[0]?.urls?.regular;
  return u?.trim() || null;
}

export async function fetchDestinationCoverUrl(destination: string): Promise<string | null> {
  const d = destination.trim();
  if (d.length < 2) {
    return null;
  }

  const unsplashKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY?.trim();
  if (unsplashKey) {
    try {
      const u = await fetchFromUnsplash(d, unsplashKey);
      if (u) {
        return u;
      }
    } catch {
      /* use Commons */
    }
  }

  const queries = [`${d} city skyline`, `${d} city`, d];
  for (const q of queries) {
    try {
      const found = await tryWikimediaSearch(q);
      if (found) {
        return found;
      }
    } catch {
      /* try next query */
    }
  }
  return null;
}

export const destinationCoverPhotoQueryKey = (destination: string) =>
  ['destinationCoverPhoto', destination.trim().toLowerCase()] as const;
