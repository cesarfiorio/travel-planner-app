/**
 * Free destination hero images for Community when no cover_photo_url is stored.
 * 1) Optional: Unsplash Search API if EXPO_PUBLIC_UNSPLASH_ACCESS_KEY is set (see Unsplash API guidelines).
 * 2) Default: Wikimedia Commons file search (no key; follow https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).
 */

const WIKIMEDIA_USER_AGENT = 'RouteFlow/1.0 (community destination covers; React Native)';

type WmImageInfo = {
  thumburl?: string;
  url?: string;
  thumbwidth?: number;
  thumbheight?: number;
  width?: number;
  height?: number;
};

type WmQueryJson = {
  query?: { pages?: Record<string, { imageinfo?: WmImageInfo[] }> };
};

type WikipediaPageImagesJson = {
  query?: {
    pages?: Record<
      string,
      {
        missing?: string;
        thumbnail?: { source?: string; width?: number; height?: number };
        original?: { source?: string; width?: number; height?: number };
      }
    >;
  };
};

type UnsplashSearchJson = {
  results?: { width?: number; height?: number; urls?: { regular?: string } }[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((x) => x.trim()).filter((x) => x.length >= 2)));
}

function destinationSearchTerms(destination: string): string[] {
  const primary = destination.split(',')[0]?.trim() ?? destination;
  return unique([destination, primary]);
}

function isLandscape(width: unknown, height: unknown): boolean {
  return typeof width === 'number' && typeof height === 'number' && width > height;
}

async function fetchWikipediaPageImage(destination: string): Promise<string | null> {
  for (const title of destinationSearchTerms(destination)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'pageimages',
      piprop: 'thumbnail|original',
      pithumbsize: '1200',
      redirects: '1',
      titles: title,
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: {
        'User-Agent': WIKIMEDIA_USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      continue;
    }
    const json = (await res.json()) as WikipediaPageImagesJson;
    const page = Object.values(json.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined) {
      continue;
    }
    const image = page.thumbnail ?? page.original;
    const url = image?.source || null;
    if (!isLandscape(image?.width, image?.height)) {
      continue;
    }
    if (url?.trim()) {
      return url;
    }
  }
  return null;
}

async function tryWikimediaSearch(search: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: search,
    gsrnamespace: '6',
    gsrlimit: '10',
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
  for (const page of Object.values(pages)) {
    const info = page?.imageinfo?.[0];
    if (!info) {
      continue;
    }
    const width = info.thumbwidth ?? info.width;
    const height = info.thumbheight ?? info.height;
    if (!isLandscape(width, height)) {
      continue;
    }
    const url = info.thumburl || info.url || null;
    if (url?.trim()) {
      return url;
    }
  }
  return null;
}

async function fetchFromUnsplash(destination: string, clientId: string): Promise<string | null> {
  const query = `${destination} famous landmark travel`;
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=1&orientation=landscape&content_filter=high&client_id=${encodeURIComponent(clientId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as UnsplashSearchJson;
  const image = json.results?.find((result) => isLandscape(result.width, result.height));
  const u = image?.urls?.regular;
  return u?.trim() || null;
}

export async function fetchDestinationCoverUrl(destination: string): Promise<string | null> {
  const d = destination.trim();
  if (d.length < 2) {
    return null;
  }

  try {
    const wikipediaImage = await fetchWikipediaPageImage(d);
    if (wikipediaImage) {
      return wikipediaImage;
    }
  } catch {
    /* use other providers */
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

  const terms = destinationSearchTerms(d);
  const queries = unique(terms.flatMap((term) => [`${term} famous landmark`, `${term} city skyline`, `${term} city`, term]));
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
  ['destinationCoverPhoto', 'v3', destination.trim().toLowerCase()] as const;
