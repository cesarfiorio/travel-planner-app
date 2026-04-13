/** Fields needed for display (matches `ItineraryPlaceVm` schedule slice). */
export type ItineraryScheduleSlice = {
  startTimeLocal: string | null;
  durationMinutes: number | null;
};

/**
 * Fallback pattern when a stop has no saved time/duration (legacy / empty DB).
 */
const PRESETS = [
  { h: 9, m: 0, dur: 1.5 },
  { h: 11, m: 30, dur: 1 },
  { h: 14, m: 0, dur: 1 },
  { h: 18, m: 0, dur: 2 },
] as const;

/** Wall-clock hour/minute for the preset slot at `orderIndex` (when DB time is unset). */
export function itineraryPresetClock(orderIndex: number): { h: number; m: number } {
  const p = PRESETS[orderIndex % PRESETS.length];
  return { h: p.h, m: p.m };
}

export function itinerarySlotTimeAndDuration(orderIndex: number, locale: string): { timeLabel: string; durationHours: number } {
  const p = PRESETS[orderIndex % PRESETS.length];
  const ref = new Date(2000, 0, 1, p.h, p.m, 0);
  return {
    timeLabel: ref.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    durationHours: p.dur,
  };
}

/** Parse `HH:MM` (24h) saved on `trip_places.start_time_local`. */
function parseHHMM(s: string | null | undefined): { h: number; m: number } | null {
  if (!s?.trim()) {
    return null;
  }
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return null;
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return { h, m: min };
}

/** Time + duration for list cards: prefers DB; falls back to preset by slot index. */
export function itinerarySlotDisplay(row: ItineraryScheduleSlice, orderIndex: number, locale: string): { timeLabel: string; durationHours: number } {
  const parsed = parseHHMM(row.startTimeLocal);
  if (parsed) {
    const ref = new Date(2000, 0, 1, parsed.h, parsed.m, 0);
    const timeLabel = ref.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    if (row.durationMinutes != null && row.durationMinutes > 0) {
      return { timeLabel, durationHours: row.durationMinutes / 60 };
    }
    const fallback = itinerarySlotTimeAndDuration(orderIndex, locale);
    return { timeLabel, durationHours: fallback.durationHours };
  }
  return itinerarySlotTimeAndDuration(orderIndex, locale);
}
