/**
 * Display-only formatting: cents → localized currency string.
 */

export function formatCurrency(cents: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'USD',
    }).format(cents / 100);
  } catch {
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    return `${sign}${currency} ${(abs / 100).toFixed(2)}`;
  }
}
