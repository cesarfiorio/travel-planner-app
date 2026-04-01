export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

const byCode = new Map<string, (typeof SUPPORTED_CURRENCIES)[number]>(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
);

export function getCurrency(code: string) {
  return byCode.get(code) ?? SUPPORTED_CURRENCIES[0];
}

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP', 'COP']);

export function isZeroDecimalCurrency(code: string): boolean {
  return ZERO_DECIMAL.has(code);
}

/** Locale-aware → device locale determines group separators, symbol position, etc. */
export function formatAmount(cents: number, currencyCode: string, locale?: string): string {
  try {
    const code = currencyCode.length === 3 ? currencyCode : 'USD';
    return new Intl.NumberFormat(locale ?? 'en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: isZeroDecimalCurrency(code) ? 0 : 2,
      maximumFractionDigits: isZeroDecimalCurrency(code) ? 0 : 2,
    }).format(cents / 100);
  } catch {
    const c = getCurrency(currencyCode);
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    const decimals = isZeroDecimalCurrency(currencyCode) ? 0 : 2;
    return `${sign}${c.symbol}${(abs / 100).toFixed(decimals)}`;
  }
}

/** Best-guess default currency from device locale region. */
export function defaultCurrencyForLocale(locale?: string): CurrencyCode {
  const region = (locale ?? '').split(/[-_]/).pop()?.toUpperCase() ?? '';
  const regionMap: Record<string, CurrencyCode> = {
    US: 'USD', BR: 'BRL', GB: 'GBP', JP: 'JPY', CA: 'CAD', AU: 'AUD',
    CH: 'CHF', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
    PL: 'PLN', NO: 'NOK', SE: 'SEK', DK: 'DKK', TH: 'THB', ID: 'IDR', IN: 'INR',
    DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', AT: 'EUR',
    BE: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  };
  return regionMap[region] ?? 'USD';
}
