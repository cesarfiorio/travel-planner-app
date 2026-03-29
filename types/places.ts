/** Search buckets sent to the search-places Edge Function. */
export type PlaceCategory =
  | 'restaurants'
  | 'attractions'
  | 'outdoor'
  | 'nightlife'
  | 'shopping'
  | 'accommodation';

/** Place row returned from the proxy (maps DB + Google fields). */
export interface Place {
  id: string;
  google_place_id: string | null;
  name: string;
  category: PlaceCategory;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  price_level: number | null;
  /** Google Places `photo_reference` values (safe to expose; not API URLs with a key). */
  photos: string[];
  opening_hours: Record<string, unknown> | null;
  website: string | null;
  phone: string | null;
}

/** Reserved for a future Place Details flow; extends {@link Place} today. */
export interface PlaceDetail extends Place {
  business_status?: string | null;
}
