/**
 * Display-only formatting: cents → localized currency string.
 * Re-exports formatAmount from constants/currencies for backwards compat.
 */

import { formatAmount } from '../../constants/currencies';

export function formatCurrency(cents: number, currency: string, locale?: string): string {
  return formatAmount(cents, currency, locale);
}
