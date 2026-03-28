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
