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
 * Featured trip on Explore: prefer the user's selection if it is still active or upcoming;
 * otherwise the first trip after {@link sortTripsForHome} (upcoming before completed).
 */
export function pickFeaturedTripForHome<T extends TripHomeSortInput>(sorted: T[], activeId: string | null): T | null {
  if (sorted.length === 0) {
    return null;
  }
  if (activeId) {
    const sel = sorted.find((t) => t.id === activeId);
    if (sel) {
      const st = deriveTripUiStatus(sel);
      if (st === 'active' || st === 'planning') {
        return sel;
      }
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
