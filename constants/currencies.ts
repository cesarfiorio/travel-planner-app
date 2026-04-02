export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimalDigits: 2 as const },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', decimalDigits: 2 as const },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', decimalDigits: 2 as const },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', decimalDigits: 2 as const },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', decimalDigits: 0 as const },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', decimalDigits: 0 as const },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', decimalDigits: 2 as const },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', decimalDigits: 2 as const },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭', decimalDigits: 2 as const },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽', decimalDigits: 2 as const },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', flag: '🇦🇷', decimalDigits: 2 as const },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', flag: '🇨🇱', decimalDigits: 0 as const },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', flag: '🇨🇴', decimalDigits: 2 as const },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪', decimalDigits: 2 as const },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', decimalDigits: 2 as const },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', decimalDigits: 2 as const },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', decimalDigits: 2 as const },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', decimalDigits: 2 as const },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', decimalDigits: 2 as const },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', decimalDigits: 2 as const },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', decimalDigits: 2 as const },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

const byCode = new Map<string, (typeof SUPPORTED_CURRENCIES)[number]>(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
);

export function getCurrency(code: string) {
  return byCode.get(code) ?? SUPPORTED_CURRENCIES[0];
}

export function isZeroDecimalCurrency(code: string): boolean {
  return getCurrency(code).decimalDigits === 0;
}

/** Same rule as `fromCents` in `lib/utils/splitCalculator.ts` (kept here to avoid circular imports). */
function minorUnitsToDisplayAmount(cents: number, currencyCode: string): number {
  const c = getCurrency(currencyCode);
  return c.decimalDigits === 0 ? cents : cents / 100;
}

export function formatAmount(cents: number, currencyCode: string, _locale?: string): string {
  const c = getCurrency(currencyCode);
  const amount = minorUnitsToDisplayAmount(cents, currencyCode);
  const decimals = c.decimalDigits;
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}${c.symbol}${abs.toFixed(decimals)}`;
}

/** Best-guess default currency from device locale region. */
export function defaultCurrencyForLocale(locale?: string): CurrencyCode {
  const region = (locale ?? '').split(/[-_]/).pop()?.toUpperCase() ?? '';
  const regionMap: Record<string, CurrencyCode> = {
    US: 'USD', BR: 'BRL', GB: 'GBP', JP: 'JPY', KR: 'KRW', CA: 'CAD', AU: 'AUD',
    CH: 'CHF', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
    PL: 'PLN', NO: 'NOK', SE: 'SEK', DK: 'DKK', TH: 'THB', ID: 'IDR', IN: 'INR',
    DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', AT: 'EUR',
    BE: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  };
  return regionMap[region] ?? 'USD';
}
