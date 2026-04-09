import type { ItineraryPlaceVm } from '../hooks/useItinerary';
import type { Json } from '../supabase/types';

/** Serializable copy of itinerary rows saved on `trip_memories.itinerary_snapshot`. */
export function itinerarySnapshotFromPlaces(places: ItineraryPlaceVm[]): Json {
  return places.map((p) => ({
    placeId: p.placeId,
    name: p.name,
    dayNumber: p.dayNumber,
    orderIndex: p.orderIndex,
    status: p.status,
  }));
}
