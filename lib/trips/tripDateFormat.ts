import { parseLocalDate } from './tripUi';

/** e.g. `May 15 - May 22, 2026` when same year. */
export function formatTripHeroDateRange(
  startYmd: string | null,
  endYmd: string | null,
  locale: string,
): string {
  const s = parseLocalDate(startYmd);
  const e = parseLocalDate(endYmd);
  if (!s || !e) {
    return '';
  }
  const y1 = s.getFullYear();
  const y2 = e.getFullYear();
  const sm = s.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const em = e.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (y1 === y2) {
    return `${sm} - ${em}, ${y1}`;
  }
  return `${s.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} - ${e.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
