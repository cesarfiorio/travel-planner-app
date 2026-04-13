export type TripUiStatus = 'planning' | 'active' | 'completed' | 'archived';

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseLocalDate(ymd: string | null): Date | null {
  if (!ymd?.trim()) {
    return null;
  }
  const [y, m, day] = ymd.split('-').map(Number);
  if (!y || !m || !day) {
    return null;
  }
  return new Date(y, m - 1, day);
}

export function deriveTripUiStatus(trip: {
  status: string;
  start_date: string | null;
  end_date: string | null;
}): TripUiStatus {
  if (trip.status === 'cancelled') {
    return 'archived';
  }
  const today = startOfDay(new Date());
  const start = parseLocalDate(trip.start_date);
  const end = parseLocalDate(trip.end_date);
  if (!start || !end) {
    return 'planning';
  }
  if (today < start) {
    return 'planning';
  }
  if (today > end) {
    return 'completed';
  }
  return 'active';
}

/**
 * Local calendar: trip end date has arrived or passed (today >= end), but DB row is not completed yet.
 * Includes the last day and any day after — matches when {@link deriveTripUiStatus} is `active` or `completed`.
 */
export function isTripOnOrAfterEndDateLocal(trip: {
  start_date: string | null;
  end_date: string | null;
  status: string;
}): boolean {
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    return false;
  }
  const end = parseLocalDate(trip.end_date);
  if (!end) {
    return false;
  }
  const today = startOfDay(new Date());
  const start = parseLocalDate(trip.start_date);
  if (start && today < startOfDay(start)) {
    return false;
  }
  return today.getTime() >= startOfDay(end).getTime();
}

/** Both start and end dates are strictly before today (local calendar). */
export function isFullyPastTripDates(start: Date, end: Date): boolean {
  const today = startOfDay(new Date());
  return startOfDay(end) < today && startOfDay(start) < today;
}

/** Home / switcher: completed trips only appear under Past trips, not in Your trips. */
export function tripsForHomeTripList<T extends { status: string }>(trips: T[]): T[] {
  return trips.filter((t) => t.status !== 'completed');
}

/** First screen when opening a trip: completed → trip recap (`finish`); otherwise trip hub. */
export function primaryTripEntryPath(trip: { id: string; status: string }): string {
  if (trip.status === 'completed') {
    return `/trip/${trip.id}/finish`;
  }
  return `/trip/${trip.id}`;
}

const HOME_STATUS_ORDER: Record<TripUiStatus, number> = {
  active: 0,
  planning: 1,
  completed: 2,
  archived: 3,
};

/** Trips you can still travel on or plan for sort before past trips. */
export type TripHomeSortInput = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export function sortTripsForHome<T extends TripHomeSortInput>(trips: T[]): T[] {
  return [...trips].sort((a, b) => {
    const sa = deriveTripUiStatus(a);
    const sb = deriveTripUiStatus(b);
    const ra = HOME_STATUS_ORDER[sa];
    const rb = HOME_STATUS_ORDER[sb];
    if (ra !== rb) {
      return ra - rb;
    }
    const startA = parseLocalDate(a.start_date)?.getTime() ?? 0;
    const startB = parseLocalDate(b.start_date)?.getTime() ?? 0;
    if (sa === 'active' || sa === 'planning') {
      return startA - startB;
    }
    const endA = parseLocalDate(a.end_date)?.getTime() ?? 0;
    const endB = parseLocalDate(b.end_date)?.getTime() ?? 0;
    return endB - endA;
  });
}

/**
 * Featured trip on Home: if the user already picked a trip (including past/completed), keep it;
 * otherwise default to the first trip after {@link sortTripsForHome}.
 */
export function pickFeaturedTripForHome<T extends TripHomeSortInput>(sorted: T[], activeId: string | null): T | null {
  if (sorted.length === 0) {
    return null;
  }
  if (activeId) {
    const sel = sorted.find((t) => t.id === activeId);
    if (sel) {
      return sel;
    }
  }
  return sorted[0];
}

export function diffDays(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

export function tripDurationDays(start: Date, end: Date): number {
  return Math.max(1, diffDays(start, end) + 1);
}

export function dayIndexInTrip(today: Date, start: Date, end: Date): number {
  if (today < start) {
    return 0;
  }
  if (today > end) {
    return tripDurationDays(start, end);
  }
  return diffDays(start, today) + 1;
}

const GRADIENT_PAIRS: [string, string][] = [
  ['#FF6B35', '#F7931E'],
  ['#667eea', '#764ba2'],
  ['#11998e', '#38ef7d'],
  ['#4facfe', '#00f2fe'],
  ['#fa709a', '#fee140'],
  ['#a8edea', '#fed6e3'],
  ['#5ee7df', '#b490ca'],
  ['#f857a6', '#ff5858'],
];

export function coverGradientFromDestination(destination: string | null | undefined): [string, string] {
  const s = (destination ?? '').trim();
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return GRADIENT_PAIRS[h % GRADIENT_PAIRS.length];
}
