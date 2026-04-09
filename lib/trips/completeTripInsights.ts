import { parseLocalDate, tripDurationDays } from './tripUi';

import type { ItineraryPlaceVm } from '../hooks/useItinerary';

function addDays(ymd: string, daysToAdd: number): Date | null {
  const base = parseLocalDate(ymd);
  if (!base) {
    return null;
  }
  const d = new Date(base);
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

/** Day with the most visited stops (ties → smallest day number). */
export function mostActiveDayInfo(
  places: ItineraryPlaceVm[],
  tripStartYmd: string | null,
  locale: string,
): { dateLabel: string; count: number } | null {
  const visited = places.filter((p) => p.status === 'visited');
  const usePlaces = visited.length > 0 ? visited : places;
  if (usePlaces.length === 0) {
    return null;
  }
  const byDay = new Map<number, number>();
  for (const p of usePlaces) {
    byDay.set(p.dayNumber, (byDay.get(p.dayNumber) ?? 0) + 1);
  }
  let bestDay = 0;
  let bestCount = -1;
  for (const [dayNum, c] of byDay) {
    if (c > bestCount || (c === bestCount && (bestDay === 0 || dayNum < bestDay))) {
      bestCount = c;
      bestDay = dayNum;
    }
  }
  if (bestDay < 1 || bestCount < 1) {
    return null;
  }
  let dateLabel = `Day ${bestDay}`;
  if (tripStartYmd?.trim()) {
    const d = addDays(tripStartYmd, bestDay - 1);
    if (d) {
      dateLabel = d.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
    }
  }
  return { dateLabel, count: bestCount };
}

/** Place that appears most often in the itinerary (visited rows preferred). */
export function favoriteSpotInfo(places: ItineraryPlaceVm[]): { name: string; visits: number } | null {
  const visited = places.filter((p) => p.status === 'visited');
  const usePlaces = visited.length > 0 ? visited : places;
  if (usePlaces.length === 0) {
    return null;
  }
  const byId = new Map<string, { name: string; n: number }>();
  for (const p of usePlaces) {
    const prev = byId.get(p.placeId);
    if (prev) {
      prev.n += 1;
    } else {
      byId.set(p.placeId, { name: p.name, n: 1 });
    }
  }
  let bestId = '';
  let bestName = '';
  let bestN = 0;
  for (const [id, v] of byId) {
    if (v.n > bestN) {
      bestN = v.n;
      bestName = v.name;
      bestId = id;
    } else if (v.n === bestN && id.localeCompare(bestId) < 0) {
      bestName = v.name;
      bestId = id;
    }
  }
  if (bestN < 1) {
    return null;
  }
  return { name: bestName, visits: bestN };
}

export function tripDurationDaysFromStrings(start: string | null, end: string | null): number | null {
  const a = parseLocalDate(start);
  const b = parseLocalDate(end);
  if (!a || !b) {
    return null;
  }
  return tripDurationDays(a, b);
}
