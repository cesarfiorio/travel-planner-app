/**
 * Display-only time/duration for itinerary cards (no DB fields yet).
 * Cycles through a schedule pattern similar to the product mock.
 */
const PRESETS = [
  { h: 9, m: 0, dur: 1.5 },
  { h: 11, m: 30, dur: 1 },
  { h: 14, m: 0, dur: 1 },
  { h: 18, m: 0, dur: 2 },
] as const;

export function itinerarySlotTimeAndDuration(orderIndex: number, locale: string): { timeLabel: string; durationHours: number } {
  const p = PRESETS[orderIndex % PRESETS.length];
  const ref = new Date(2000, 0, 1, p.h, p.m, 0);
  return {
    timeLabel: ref.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    durationHours: p.dur,
  };
}
