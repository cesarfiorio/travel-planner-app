export interface Country {
  code: string;
  name: string;
  continent: string;
  lat: number;
  lng: number;
}

export const TOTAL_COUNTRIES = 195;

export const COUNTRIES: Country[] = [
  // Africa (54)
  { code: 'DZ', name: 'Algeria', continent: 'Africa', lat: 28.03, lng: 1.66 },
  { code: 'AO', name: 'Angola', continent: 'Africa', lat: -11.2, lng: 17.87 },
  { code: 'BJ', name: 'Benin', continent: 'Africa', lat: 9.31, lng: 2.32 },
  { code: 'BW', name: 'Botswana', continent: 'Africa', lat: -22.33, lng: 24.68 },
  { code: 'BF', name: 'Burkina Faso', continent: 'Africa', lat: 12.37, lng: -1.52 },
  { code: 'BI', name: 'Burundi', continent: 'Africa', lat: -3.37, lng: 29.92 },
  { code: 'CV', name: 'Cabo Verde', continent: 'Africa', lat: 16.0, lng: -24.01 },
  { code: 'CM', name: 'Cameroon', continent: 'Africa', lat: 7.37, lng: 12.35 },
  { code: 'CF', name: 'Central African Republic', continent: 'Africa', lat: 6.61, lng: 20.94 },
  { code: 'TD', name: 'Chad', continent: 'Africa', lat: 15.45, lng: 18.73 },
  { code: 'KM', name: 'Comoros', continent: 'Africa', lat: -11.88, lng: 43.87 },
  { code: 'CG', name: 'Congo', continent: 'Africa', lat: -0.23, lng: 15.83 },
  { code: 'CD', name: 'Democratic Republic of the Congo', continent: 'Africa', lat: -4.04, lng: 21.76 },
  { code: 'CI', name: "Côte d'Ivoire", continent: 'Africa', lat: 7.54, lng: -5.55 },
  { code: 'DJ', name: 'Djibouti', continent: 'Africa', lat: 11.83, lng: 42.59 },
  { code: 'EG', name: 'Egypt', continent: 'Africa', lat: 26.82, lng: 30.8 },
  { code: 'GQ', name: 'Equatorial Guinea', continent: 'Africa', lat: 1.65, lng: 10.27 },
  { code: 'ER', name: 'Eritrea', continent: 'Africa', lat: 15.18, lng: 39.78 },
  { code: 'SZ', name: 'Eswatini', continent: 'Africa', lat: -26.52, lng: 31.47 },
  { code: 'ET', name: 'Ethiopia', continent: 'Africa', lat: 9.15, lng: 40.49 },
  { code: 'GA', name: 'Gabon', continent: 'Africa', lat: -0.8, lng: 11.61 },
  { code: 'GM', name: 'Gambia', continent: 'Africa', lat: 13.44, lng: -15.31 },
  { code: 'GH', name: 'Ghana', continent: 'Africa', lat: 7.95, lng: -1.02 },
  { code: 'GN', name: 'Guinea', continent: 'Africa', lat: 9.95, lng: -9.7 },
  { code: 'GW', name: 'Guinea-Bissau', continent: 'Africa', lat: 11.8, lng: -15.18 },
  { code: 'KE', name: 'Kenya', continent: 'Africa', lat: -0.02, lng: 37.91 },
  { code: 'LS', name: 'Lesotho', continent: 'Africa', lat: -29.61, lng: 28.23 },
  { code: 'LR', name: 'Liberia', continent: 'Africa', lat: 6.43, lng: -9.43 },
  { code: 'LY', name: 'Libya', continent: 'Africa', lat: 26.34, lng: 17.23 },
  { code: 'MG', name: 'Madagascar', continent: 'Africa', lat: -18.77, lng: 46.87 },
  { code: 'MW', name: 'Malawi', continent: 'Africa', lat: -13.25, lng: 34.3 },
  { code: 'ML', name: 'Mali', continent: 'Africa', lat: 17.57, lng: -4.0 },
  { code: 'MR', name: 'Mauritania', continent: 'Africa', lat: 21.01, lng: -10.94 },
  { code: 'MU', name: 'Mauritius', continent: 'Africa', lat: -20.35, lng: 57.55 },
  { code: 'MA', name: 'Morocco', continent: 'Africa', lat: 31.79, lng: -7.09 },
  { code: 'MZ', name: 'Mozambique', continent: 'Africa', lat: -18.67, lng: 35.53 },
  { code: 'NA', name: 'Namibia', continent: 'Africa', lat: -22.96, lng: 18.49 },
  { code: 'NE', name: 'Niger', continent: 'Africa', lat: 17.61, lng: 8.08 },
  { code: 'NG', name: 'Nigeria', continent: 'Africa', lat: 9.08, lng: 8.68 },
  { code: 'RW', name: 'Rwanda', continent: 'Africa', lat: -1.94, lng: 29.87 },
  { code: 'ST', name: 'São Tomé and Príncipe', continent: 'Africa', lat: 0.19, lng: 6.61 },
  { code: 'SN', name: 'Senegal', continent: 'Africa', lat: 14.5, lng: -14.45 },
  { code: 'SC', name: 'Seychelles', continent: 'Africa', lat: -4.68, lng: 55.49 },
  { code: 'SL', name: 'Sierra Leone', continent: 'Africa', lat: 8.46, lng: -11.78 },
  { code: 'SO', name: 'Somalia', continent: 'Africa', lat: 5.15, lng: 46.2 },
  { code: 'ZA', name: 'South Africa', continent: 'Africa', lat: -30.56, lng: 22.94 },
  { code: 'SS', name: 'South Sudan', continent: 'Africa', lat: 6.88, lng: 31.31 },
  { code: 'SD', name: 'Sudan', continent: 'Africa', lat: 12.86, lng: 30.22 },
  { code: 'TZ', name: 'Tanzania', continent: 'Africa', lat: -6.37, lng: 34.89 },
  { code: 'TG', name: 'Togo', continent: 'Africa', lat: 8.62, lng: 0.82 },
  { code: 'TN', name: 'Tunisia', continent: 'Africa', lat: 33.89, lng: 9.54 },
  { code: 'UG', name: 'Uganda', continent: 'Africa', lat: 1.37, lng: 32.29 },
  { code: 'ZM', name: 'Zambia', continent: 'Africa', lat: -13.13, lng: 27.85 },
  { code: 'ZW', name: 'Zimbabwe', continent: 'Africa', lat: -19.02, lng: 29.15 },

  // Asia (48)
  { code: 'AF', name: 'Afghanistan', continent: 'Asia', lat: 33.94, lng: 67.71 },
  { code: 'AM', name: 'Armenia', continent: 'Asia', lat: 40.07, lng: 45.04 },
  { code: 'AZ', name: 'Azerbaijan', continent: 'Asia', lat: 40.14, lng: 47.58 },
  { code: 'BH', name: 'Bahrain', continent: 'Asia', lat: 26.07, lng: 50.56 },
  { code: 'BD', name: 'Bangladesh', continent: 'Asia', lat: 23.68, lng: 90.36 },
  { code: 'BT', name: 'Bhutan', continent: 'Asia', lat: 27.51, lng: 90.43 },
  { code: 'BN', name: 'Brunei', continent: 'Asia', lat: 4.54, lng: 114.73 },
  { code: 'KH', name: 'Cambodia', continent: 'Asia', lat: 12.57, lng: 104.99 },
  { code: 'CN', name: 'China', continent: 'Asia', lat: 35.86, lng: 104.2 },
  { code: 'CY', name: 'Cyprus', continent: 'Asia', lat: 35.13, lng: 33.43 },
  { code: 'GE', name: 'Georgia', continent: 'Asia', lat: 42.32, lng: 43.36 },
  { code: 'IN', name: 'India', continent: 'Asia', lat: 20.59, lng: 78.96 },
  { code: 'ID', name: 'Indonesia', continent: 'Asia', lat: -0.79, lng: 113.92 },
  { code: 'IR', name: 'Iran', continent: 'Asia', lat: 32.43, lng: 53.69 },
  { code: 'IQ', name: 'Iraq', continent: 'Asia', lat: 33.22, lng: 43.68 },
  { code: 'IL', name: 'Israel', continent: 'Asia', lat: 31.05, lng: 34.85 },
  { code: 'JP', name: 'Japan', continent: 'Asia', lat: 36.2, lng: 138.25 },
  { code: 'JO', name: 'Jordan', continent: 'Asia', lat: 30.59, lng: 36.24 },
  { code: 'KZ', name: 'Kazakhstan', continent: 'Asia', lat: 48.02, lng: 66.92 },
  { code: 'KW', name: 'Kuwait', continent: 'Asia', lat: 29.31, lng: 47.48 },
  { code: 'KG', name: 'Kyrgyzstan', continent: 'Asia', lat: 41.2, lng: 74.77 },
  { code: 'LA', name: 'Laos', continent: 'Asia', lat: 19.86, lng: 102.5 },
  { code: 'LB', name: 'Lebanon', continent: 'Asia', lat: 33.85, lng: 35.86 },
  { code: 'MY', name: 'Malaysia', continent: 'Asia', lat: 4.21, lng: 101.98 },
  { code: 'MV', name: 'Maldives', continent: 'Asia', lat: 3.2, lng: 73.22 },
  { code: 'MN', name: 'Mongolia', continent: 'Asia', lat: 46.86, lng: 103.85 },
  { code: 'MM', name: 'Myanmar', continent: 'Asia', lat: 21.91, lng: 95.96 },
  { code: 'NP', name: 'Nepal', continent: 'Asia', lat: 28.39, lng: 84.12 },
  { code: 'KP', name: 'North Korea', continent: 'Asia', lat: 40.34, lng: 127.51 },
  { code: 'OM', name: 'Oman', continent: 'Asia', lat: 21.47, lng: 55.98 },
  { code: 'PK', name: 'Pakistan', continent: 'Asia', lat: 30.38, lng: 69.35 },
  { code: 'PS', name: 'Palestine', continent: 'Asia', lat: 31.95, lng: 35.23 },
  { code: 'PH', name: 'Philippines', continent: 'Asia', lat: 12.88, lng: 121.77 },
  { code: 'QA', name: 'Qatar', continent: 'Asia', lat: 25.35, lng: 51.18 },
  { code: 'SA', name: 'Saudi Arabia', continent: 'Asia', lat: 23.89, lng: 45.08 },
  { code: 'SG', name: 'Singapore', continent: 'Asia', lat: 1.35, lng: 103.82 },
  { code: 'KR', name: 'South Korea', continent: 'Asia', lat: 35.91, lng: 127.77 },
  { code: 'LK', name: 'Sri Lanka', continent: 'Asia', lat: 7.87, lng: 80.77 },
  { code: 'SY', name: 'Syria', continent: 'Asia', lat: 34.8, lng: 39.0 },
  { code: 'TW', name: 'Taiwan', continent: 'Asia', lat: 23.7, lng: 120.96 },
  { code: 'TJ', name: 'Tajikistan', continent: 'Asia', lat: 38.86, lng: 71.28 },
  { code: 'TH', name: 'Thailand', continent: 'Asia', lat: 15.87, lng: 100.99 },
  { code: 'TL', name: 'Timor-Leste', continent: 'Asia', lat: -8.87, lng: 125.73 },
  { code: 'TR', name: 'Turkey', continent: 'Asia', lat: 38.96, lng: 35.24 },
  { code: 'TM', name: 'Turkmenistan', continent: 'Asia', lat: 38.97, lng: 59.56 },
  { code: 'AE', name: 'United Arab Emirates', continent: 'Asia', lat: 23.42, lng: 53.85 },
  { code: 'UZ', name: 'Uzbekistan', continent: 'Asia', lat: 41.38, lng: 64.59 },
  { code: 'VN', name: 'Vietnam', continent: 'Asia', lat: 14.06, lng: 108.28 },
  { code: 'YE', name: 'Yemen', continent: 'Asia', lat: 15.55, lng: 48.52 },

  // Europe (44)
  { code: 'AL', name: 'Albania', continent: 'Europe', lat: 41.15, lng: 20.17 },
  { code: 'AD', name: 'Andorra', continent: 'Europe', lat: 42.55, lng: 1.6 },
  { code: 'AT', name: 'Austria', continent: 'Europe', lat: 47.52, lng: 14.55 },
  { code: 'BY', name: 'Belarus', continent: 'Europe', lat: 53.71, lng: 27.95 },
  { code: 'BE', name: 'Belgium', continent: 'Europe', lat: 50.5, lng: 4.47 },
  { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'Europe', lat: 43.92, lng: 17.68 },
  { code: 'BG', name: 'Bulgaria', continent: 'Europe', lat: 42.73, lng: 25.49 },
  { code: 'HR', name: 'Croatia', continent: 'Europe', lat: 45.1, lng: 15.2 },
  { code: 'CZ', name: 'Czech Republic', continent: 'Europe', lat: 49.82, lng: 15.47 },
  { code: 'DK', name: 'Denmark', continent: 'Europe', lat: 56.26, lng: 9.5 },
  { code: 'EE', name: 'Estonia', continent: 'Europe', lat: 58.6, lng: 25.01 },
  { code: 'FI', name: 'Finland', continent: 'Europe', lat: 61.92, lng: 25.75 },
  { code: 'FR', name: 'France', continent: 'Europe', lat: 46.23, lng: 2.21 },
  { code: 'DE', name: 'Germany', continent: 'Europe', lat: 51.17, lng: 10.45 },
  { code: 'GR', name: 'Greece', continent: 'Europe', lat: 39.07, lng: 21.82 },
  { code: 'HU', name: 'Hungary', continent: 'Europe', lat: 47.16, lng: 19.5 },
  { code: 'IS', name: 'Iceland', continent: 'Europe', lat: 64.96, lng: -19.02 },
  { code: 'IE', name: 'Ireland', continent: 'Europe', lat: 53.14, lng: -7.69 },
  { code: 'IT', name: 'Italy', continent: 'Europe', lat: 41.87, lng: 12.57 },
  { code: 'XK', name: 'Kosovo', continent: 'Europe', lat: 42.6, lng: 20.9 },
  { code: 'LV', name: 'Latvia', continent: 'Europe', lat: 56.88, lng: 24.6 },
  { code: 'LI', name: 'Liechtenstein', continent: 'Europe', lat: 47.17, lng: 9.56 },
  { code: 'LT', name: 'Lithuania', continent: 'Europe', lat: 55.17, lng: 23.88 },
  { code: 'LU', name: 'Luxembourg', continent: 'Europe', lat: 49.82, lng: 6.13 },
  { code: 'MT', name: 'Malta', continent: 'Europe', lat: 35.94, lng: 14.38 },
  { code: 'MD', name: 'Moldova', continent: 'Europe', lat: 47.41, lng: 28.37 },
  { code: 'MC', name: 'Monaco', continent: 'Europe', lat: 43.75, lng: 7.41 },
  { code: 'ME', name: 'Montenegro', continent: 'Europe', lat: 42.71, lng: 19.37 },
  { code: 'NL', name: 'Netherlands', continent: 'Europe', lat: 52.13, lng: 5.29 },
  { code: 'MK', name: 'North Macedonia', continent: 'Europe', lat: 41.51, lng: 21.75 },
  { code: 'NO', name: 'Norway', continent: 'Europe', lat: 60.47, lng: 8.47 },
  { code: 'PL', name: 'Poland', continent: 'Europe', lat: 51.92, lng: 19.15 },
  { code: 'PT', name: 'Portugal', continent: 'Europe', lat: 39.4, lng: -8.22 },
  { code: 'RO', name: 'Romania', continent: 'Europe', lat: 45.94, lng: 24.97 },
  { code: 'RU', name: 'Russia', continent: 'Europe', lat: 61.52, lng: 105.32 },
  { code: 'SM', name: 'San Marino', continent: 'Europe', lat: 43.94, lng: 12.46 },
  { code: 'RS', name: 'Serbia', continent: 'Europe', lat: 44.02, lng: 21.01 },
  { code: 'SK', name: 'Slovakia', continent: 'Europe', lat: 48.67, lng: 19.7 },
  { code: 'SI', name: 'Slovenia', continent: 'Europe', lat: 46.15, lng: 14.99 },
  { code: 'ES', name: 'Spain', continent: 'Europe', lat: 40.46, lng: -3.75 },
  { code: 'SE', name: 'Sweden', continent: 'Europe', lat: 60.13, lng: 18.64 },
  { code: 'CH', name: 'Switzerland', continent: 'Europe', lat: 46.82, lng: 8.23 },
  { code: 'UA', name: 'Ukraine', continent: 'Europe', lat: 48.38, lng: 31.17 },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe', lat: 55.38, lng: -3.44 },
  { code: 'VA', name: 'Vatican City', continent: 'Europe', lat: 41.9, lng: 12.45 },

  // North America (23)
  { code: 'AG', name: 'Antigua and Barbuda', continent: 'North America', lat: 17.06, lng: -61.8 },
  { code: 'BS', name: 'Bahamas', continent: 'North America', lat: 25.03, lng: -77.4 },
  { code: 'BB', name: 'Barbados', continent: 'North America', lat: 13.19, lng: -59.54 },
  { code: 'BZ', name: 'Belize', continent: 'North America', lat: 17.19, lng: -88.5 },
  { code: 'CA', name: 'Canada', continent: 'North America', lat: 56.13, lng: -106.35 },
  { code: 'CR', name: 'Costa Rica', continent: 'North America', lat: 9.75, lng: -83.75 },
  { code: 'CU', name: 'Cuba', continent: 'North America', lat: 21.52, lng: -77.78 },
  { code: 'DM', name: 'Dominica', continent: 'North America', lat: 15.41, lng: -61.37 },
  { code: 'DO', name: 'Dominican Republic', continent: 'North America', lat: 18.74, lng: -70.16 },
  { code: 'SV', name: 'El Salvador', continent: 'North America', lat: 13.79, lng: -88.9 },
  { code: 'GD', name: 'Grenada', continent: 'North America', lat: 12.26, lng: -61.6 },
  { code: 'GT', name: 'Guatemala', continent: 'North America', lat: 15.78, lng: -90.23 },
  { code: 'HT', name: 'Haiti', continent: 'North America', lat: 18.97, lng: -72.29 },
  { code: 'HN', name: 'Honduras', continent: 'North America', lat: 15.2, lng: -86.24 },
  { code: 'JM', name: 'Jamaica', continent: 'North America', lat: 18.11, lng: -77.3 },
  { code: 'MX', name: 'Mexico', continent: 'North America', lat: 23.63, lng: -102.55 },
  { code: 'NI', name: 'Nicaragua', continent: 'North America', lat: 12.87, lng: -85.21 },
  { code: 'PA', name: 'Panama', continent: 'North America', lat: 8.54, lng: -80.78 },
  { code: 'KN', name: 'Saint Kitts and Nevis', continent: 'North America', lat: 17.36, lng: -62.78 },
  { code: 'LC', name: 'Saint Lucia', continent: 'North America', lat: 13.91, lng: -60.98 },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', continent: 'North America', lat: 12.98, lng: -61.29 },
  { code: 'TT', name: 'Trinidad and Tobago', continent: 'North America', lat: 10.69, lng: -61.22 },
  { code: 'US', name: 'United States', continent: 'North America', lat: 37.09, lng: -95.71 },

  // South America (12)
  { code: 'AR', name: 'Argentina', continent: 'South America', lat: -38.42, lng: -63.62 },
  { code: 'BO', name: 'Bolivia', continent: 'South America', lat: -16.29, lng: -63.59 },
  { code: 'BR', name: 'Brazil', continent: 'South America', lat: -14.24, lng: -51.93 },
  { code: 'CL', name: 'Chile', continent: 'South America', lat: -35.68, lng: -71.54 },
  { code: 'CO', name: 'Colombia', continent: 'South America', lat: 4.57, lng: -74.3 },
  { code: 'EC', name: 'Ecuador', continent: 'South America', lat: -1.83, lng: -78.18 },
  { code: 'GY', name: 'Guyana', continent: 'South America', lat: 4.86, lng: -58.93 },
  { code: 'PY', name: 'Paraguay', continent: 'South America', lat: -23.44, lng: -58.44 },
  { code: 'PE', name: 'Peru', continent: 'South America', lat: -9.19, lng: -75.02 },
  { code: 'SR', name: 'Suriname', continent: 'South America', lat: 3.92, lng: -56.03 },
  { code: 'UY', name: 'Uruguay', continent: 'South America', lat: -32.52, lng: -55.77 },
  { code: 'VE', name: 'Venezuela', continent: 'South America', lat: 6.42, lng: -66.59 },

  // Oceania (14)
  { code: 'AU', name: 'Australia', continent: 'Oceania', lat: -25.27, lng: 133.78 },
  { code: 'FJ', name: 'Fiji', continent: 'Oceania', lat: -17.71, lng: 178.07 },
  { code: 'KI', name: 'Kiribati', continent: 'Oceania', lat: -3.37, lng: -168.73 },
  { code: 'MH', name: 'Marshall Islands', continent: 'Oceania', lat: 7.13, lng: 171.18 },
  { code: 'FM', name: 'Micronesia', continent: 'Oceania', lat: 7.43, lng: 150.55 },
  { code: 'NR', name: 'Nauru', continent: 'Oceania', lat: -0.52, lng: 166.93 },
  { code: 'NZ', name: 'New Zealand', continent: 'Oceania', lat: -40.9, lng: 174.89 },
  { code: 'PW', name: 'Palau', continent: 'Oceania', lat: 7.51, lng: 134.58 },
  { code: 'PG', name: 'Papua New Guinea', continent: 'Oceania', lat: -6.31, lng: 143.96 },
  { code: 'WS', name: 'Samoa', continent: 'Oceania', lat: -13.76, lng: -172.1 },
  { code: 'SB', name: 'Solomon Islands', continent: 'Oceania', lat: -9.65, lng: 160.16 },
  { code: 'TO', name: 'Tonga', continent: 'Oceania', lat: -21.18, lng: -175.2 },
  { code: 'TV', name: 'Tuvalu', continent: 'Oceania', lat: -7.11, lng: 177.65 },
  { code: 'VU', name: 'Vanuatu', continent: 'Oceania', lat: -15.38, lng: 166.96 },
];

const countryMap = new Map<string, Country>(
  COUNTRIES.map((c) => [c.code, c]),
);

export function getCountry(code: string): Country | undefined {
  return countryMap.get(code.toUpperCase());
}

export function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function continentStats(countryCodes: string[]): {
  total: number;
  continents: number;
  percentage: number;
} {
  const unique = new Set(countryCodes.map((c) => c.toUpperCase()));
  const validCountries = [...unique].filter((c) => countryMap.has(c));
  const continentSet = new Set(
    validCountries.map((c) => countryMap.get(c)!.continent),
  );
  return {
    total: validCountries.length,
    continents: continentSet.size,
    percentage: Math.round((validCountries.length / TOTAL_COUNTRIES) * 100),
  };
}

const CITY_TO_COUNTRY: Record<string, string> = {
  'new york': 'US',
  'los angeles': 'US',
  'san francisco': 'US',
  chicago: 'US',
  miami: 'US',
  houston: 'US',
  seattle: 'US',
  boston: 'US',
  washington: 'US',
  'las vegas': 'US',
  honolulu: 'US',
  london: 'GB',
  manchester: 'GB',
  edinburgh: 'GB',
  paris: 'FR',
  lyon: 'FR',
  nice: 'FR',
  marseille: 'FR',
  berlin: 'DE',
  munich: 'DE',
  frankfurt: 'DE',
  hamburg: 'DE',
  madrid: 'ES',
  barcelona: 'ES',
  seville: 'ES',
  rome: 'IT',
  milan: 'IT',
  florence: 'IT',
  venice: 'IT',
  naples: 'IT',
  lisbon: 'PT',
  porto: 'PT',
  amsterdam: 'NL',
  brussels: 'BE',
  zurich: 'CH',
  geneva: 'CH',
  vienna: 'AT',
  dublin: 'IE',
  athens: 'GR',
  istanbul: 'TR',
  stockholm: 'SE',
  oslo: 'NO',
  copenhagen: 'DK',
  helsinki: 'FI',
  prague: 'CZ',
  budapest: 'HU',
  warsaw: 'PL',
  krakow: 'PL',
  bucharest: 'RO',
  zagreb: 'HR',
  dubrovnik: 'HR',
  tokyo: 'JP',
  osaka: 'JP',
  kyoto: 'JP',
  beijing: 'CN',
  shanghai: 'CN',
  'hong kong': 'CN',
  shenzhen: 'CN',
  seoul: 'KR',
  busan: 'KR',
  bangkok: 'TH',
  'chiang mai': 'TH',
  phuket: 'TH',
  hanoi: 'VN',
  'ho chi minh': 'VN',
  saigon: 'VN',
  bali: 'ID',
  jakarta: 'ID',
  manila: 'PH',
  'kuala lumpur': 'MY',
  singapore: 'SG',
  taipei: 'TW',
  mumbai: 'IN',
  delhi: 'IN',
  'new delhi': 'IN',
  goa: 'IN',
  jaipur: 'IN',
  sydney: 'AU',
  melbourne: 'AU',
  brisbane: 'AU',
  perth: 'AU',
  auckland: 'NZ',
  queenstown: 'NZ',
  cairo: 'EG',
  marrakech: 'MA',
  casablanca: 'MA',
  'cape town': 'ZA',
  johannesburg: 'ZA',
  nairobi: 'KE',
  lagos: 'NG',
  dubai: 'AE',
  'abu dhabi': 'AE',
  'tel aviv': 'IL',
  jerusalem: 'IL',
  toronto: 'CA',
  vancouver: 'CA',
  montreal: 'CA',
  'mexico city': 'MX',
  cancun: 'MX',
  'rio de janeiro': 'BR',
  'são paulo': 'BR',
  'sao paulo': 'BR',
  'buenos aires': 'AR',
  santiago: 'CL',
  bogota: 'CO',
  medellin: 'CO',
  lima: 'PE',
  cusco: 'PE',
  havana: 'CU',
  moscow: 'RU',
  'st petersburg': 'RU',
  reykjavik: 'IS',
  doha: 'QA',
  muscat: 'OM',
};

export function guessCountryFromDestination(
  destination: string,
): string | null {
  if (!destination) return null;
  const lower = destination.toLowerCase().trim();

  for (const [city, code] of Object.entries(CITY_TO_COUNTRY)) {
    if (lower.includes(city)) return code;
  }

  for (const country of COUNTRIES) {
    if (lower.includes(country.name.toLowerCase())) return country.code;
  }

  const parts = lower.split(/[,\-–—]+/).map((p) => p.trim());
  for (const part of parts) {
    for (const country of COUNTRIES) {
      if (country.name.toLowerCase() === part) return country.code;
    }
    for (const [city, code] of Object.entries(CITY_TO_COUNTRY)) {
      if (city === part) return code;
    }
  }

  return null;
}
