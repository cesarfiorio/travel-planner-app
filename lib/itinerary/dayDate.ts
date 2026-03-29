import { parseLocalDate } from '../trips/tripUi';

export function itineraryDateLabelForDay(tripStartYmd: string | null, dayNumber: number, locale: string): string {
  const start = parseLocalDate(tripStartYmd);
  if (!start) {
    return '';
  }
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
}
