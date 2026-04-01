/**
 * Simplified world map data for equirectangular projection.
 *
 * Projection formulas (SVG viewport 1000×500):
 *   svgX = (lng + 180) * (1000 / 360)
 *   svgY = (90 - lat) * (500 / 180)
 *
 * NOTE: Replace COUNTRY_PATHS with paths from Natural Earth simplified 110m
 * GeoJSON converted to equirectangular SVG. Use tools like mapshaper.org to
 * simplify and convert.
 */

/**
 * Placeholder for per-country SVG path data.
 * Keys are ISO 3166-1 alpha-2 codes, values are SVG `d` attributes.
 */
export const COUNTRY_PATHS: Record<string, string> = {};

/**
 * Approximate continent outlines for a recognizable world map silhouette.
 * Uses equirectangular projection: x ∈ [0,1000], y ∈ [0,500].
 */
export const WORLD_OUTLINE: string = [
  // North America
  'M 30,60 L 50,55 70,50 90,58 100,70 130,72 155,68 160,80 170,95',
  'L 180,108 195,115 210,118 225,120 230,130 220,145 215,155',
  'L 200,160 190,170 175,175 165,185 155,190 148,195 140,200',
  'L 132,205 128,210 120,210 115,205 105,200 95,195 85,192',
  'L 70,185 60,175 55,165 45,150 38,135 32,120 28,100 30,80 30,60 Z',

  // Central America & Caribbean
  'M 140,200 L 148,205 150,212 148,218 145,222 140,228',
  'L 138,232 136,236 140,238 145,237 148,240 150,245 148,248 Z',

  // South America
  'M 175,245 L 185,240 200,238 210,240 222,245 230,252 238,260',
  'L 245,272 248,285 246,300 242,315 240,330 238,345 235,360',
  'L 228,375 220,388 212,395 205,400 198,398 192,390 188,378',
  'L 183,365 178,350 174,335 172,318 170,300 168,285 170,270',
  'L 172,258 175,250 175,245 Z',

  // Europe
  'M 470,55 L 478,52 490,50 500,52 510,58 520,62 525,68',
  'L 528,75 530,82 535,88 540,92 545,95 548,100 545,108',
  'L 540,112 535,115 528,118 520,120 512,118 505,115 498,112',
  'L 492,108 488,105 482,100 478,95 475,88 472,80 470,70 470,55 Z',

  // Africa
  'M 468,120 L 478,118 490,116 502,118 515,122 528,128 538,135',
  'L 545,142 548,152 550,165 548,178 545,190 542,200 540,212',
  'L 538,225 535,240 530,255 525,268 518,278 510,288 502,295',
  'L 495,298 488,296 482,290 478,282 475,272 472,260 470,248',
  'L 468,235 465,222 462,210 460,198 458,185 456,172 455,160',
  'L 456,148 458,135 462,125 468,120 Z',

  // Asia
  'M 540,45 L 560,42 580,40 600,38 625,40 650,42 680,44',
  'L 710,48 740,52 760,56 780,60 800,62 820,65 830,72',
  'L 835,80 838,90 840,100 838,110 835,118 830,125 822,130',
  'L 812,135 800,138 790,140 775,142 760,140 745,138 730,135',
  'L 720,132 710,128 700,125 690,122 680,118 665,115 650,112',
  'L 635,110 620,108 605,105 590,102 575,100 565,98 555,95 548,92 Z',

  // Indian subcontinent
  'M 640,120 L 648,125 655,132 660,140 662,150 660,162',
  'L 655,170 650,175 645,172 640,165 638,155 636,145 635,135 636,128 640,120 Z',

  // Southeast Asian peninsula
  'M 710,130 L 718,135 722,142 725,150 723,160 720,168',
  'L 715,172 710,168 708,160 706,150 708,142 710,130 Z',

  // Indonesia / Maritime Southeast Asia
  'M 730,165 L 745,162 760,160 778,162 795,165 810,168',
  'L 818,172 812,176 800,178 785,180 770,178 755,176 742,174 735,172 730,165 Z',

  // Japan
  'M 835,78 L 842,75 848,80 845,88 840,92 835,88 835,78 Z',

  // Australia
  'M 790,265 L 810,258 830,252 850,250 870,252 888,258',
  'L 900,268 905,280 902,292 896,302 885,310 872,315',
  'L 858,318 842,316 828,312 815,305 805,296 798,285 794,275 790,265 Z',

  // New Zealand
  'M 928,310 L 935,305 940,310 938,318 932,325 928,320 928,310 Z',
  'M 932,326 L 938,322 942,328 940,336 935,340 930,335 932,326 Z',
].join(' ');

function toSvg(lng: number, lat: number): { x: number; y: number } {
  return {
    x: Math.round((lng + 180) * (1000 / 360)),
    y: Math.round((90 - lat) * (500 / 180)),
  };
}

/**
 * SVG coordinate centers for countries using equirectangular projection.
 * Computed from lat/lng via: x = (lng+180)*(1000/360), y = (90-lat)*(500/180).
 */
export const COUNTRY_CENTERS: Record<string, { x: number; y: number }> = {
  // Africa
  DZ: toSvg(1.66, 28.03),
  AO: toSvg(17.87, -11.2),
  BJ: toSvg(2.32, 9.31),
  BW: toSvg(24.68, -22.33),
  BF: toSvg(-1.52, 12.37),
  BI: toSvg(29.92, -3.37),
  CM: toSvg(12.35, 7.37),
  CF: toSvg(20.94, 6.61),
  TD: toSvg(18.73, 15.45),
  CG: toSvg(15.83, -0.23),
  CD: toSvg(21.76, -4.04),
  CI: toSvg(-5.55, 7.54),
  DJ: toSvg(42.59, 11.83),
  EG: toSvg(30.8, 26.82),
  GQ: toSvg(10.27, 1.65),
  ER: toSvg(39.78, 15.18),
  SZ: toSvg(31.47, -26.52),
  ET: toSvg(40.49, 9.15),
  GA: toSvg(11.61, -0.8),
  GM: toSvg(-15.31, 13.44),
  GH: toSvg(-1.02, 7.95),
  GN: toSvg(-9.7, 9.95),
  GW: toSvg(-15.18, 11.8),
  KE: toSvg(37.91, -0.02),
  LS: toSvg(28.23, -29.61),
  LR: toSvg(-9.43, 6.43),
  LY: toSvg(17.23, 26.34),
  MG: toSvg(46.87, -18.77),
  MW: toSvg(34.3, -13.25),
  ML: toSvg(-4.0, 17.57),
  MR: toSvg(-10.94, 21.01),
  MU: toSvg(57.55, -20.35),
  MA: toSvg(-7.09, 31.79),
  MZ: toSvg(35.53, -18.67),
  NA: toSvg(18.49, -22.96),
  NE: toSvg(8.08, 17.61),
  NG: toSvg(8.68, 9.08),
  RW: toSvg(29.87, -1.94),
  SN: toSvg(-14.45, 14.5),
  SC: toSvg(55.49, -4.68),
  SL: toSvg(-11.78, 8.46),
  SO: toSvg(46.2, 5.15),
  ZA: toSvg(22.94, -30.56),
  SS: toSvg(31.31, 6.88),
  SD: toSvg(30.22, 12.86),
  TZ: toSvg(34.89, -6.37),
  TG: toSvg(0.82, 8.62),
  TN: toSvg(9.54, 33.89),
  UG: toSvg(32.29, 1.37),
  ZM: toSvg(27.85, -13.13),
  ZW: toSvg(29.15, -19.02),

  // Asia
  AF: toSvg(67.71, 33.94),
  AM: toSvg(45.04, 40.07),
  AZ: toSvg(47.58, 40.14),
  BH: toSvg(50.56, 26.07),
  BD: toSvg(90.36, 23.68),
  BT: toSvg(90.43, 27.51),
  BN: toSvg(114.73, 4.54),
  KH: toSvg(104.99, 12.57),
  CN: toSvg(104.2, 35.86),
  CY: toSvg(33.43, 35.13),
  GE: toSvg(43.36, 42.32),
  IN: toSvg(78.96, 20.59),
  ID: toSvg(113.92, -0.79),
  IR: toSvg(53.69, 32.43),
  IQ: toSvg(43.68, 33.22),
  IL: toSvg(34.85, 31.05),
  JP: toSvg(138.25, 36.2),
  JO: toSvg(36.24, 30.59),
  KZ: toSvg(66.92, 48.02),
  KW: toSvg(47.48, 29.31),
  KG: toSvg(74.77, 41.2),
  LA: toSvg(102.5, 19.86),
  LB: toSvg(35.86, 33.85),
  MY: toSvg(101.98, 4.21),
  MV: toSvg(73.22, 3.2),
  MN: toSvg(103.85, 46.86),
  MM: toSvg(95.96, 21.91),
  NP: toSvg(84.12, 28.39),
  KP: toSvg(127.51, 40.34),
  OM: toSvg(55.98, 21.47),
  PK: toSvg(69.35, 30.38),
  PH: toSvg(121.77, 12.88),
  QA: toSvg(51.18, 25.35),
  SA: toSvg(45.08, 23.89),
  SG: toSvg(103.82, 1.35),
  KR: toSvg(127.77, 35.91),
  LK: toSvg(80.77, 7.87),
  SY: toSvg(39.0, 34.8),
  TW: toSvg(120.96, 23.7),
  TJ: toSvg(71.28, 38.86),
  TH: toSvg(100.99, 15.87),
  TL: toSvg(125.73, -8.87),
  TR: toSvg(35.24, 38.96),
  TM: toSvg(59.56, 38.97),
  AE: toSvg(53.85, 23.42),
  UZ: toSvg(64.59, 41.38),
  VN: toSvg(108.28, 14.06),
  YE: toSvg(48.52, 15.55),

  // Europe
  AL: toSvg(20.17, 41.15),
  AT: toSvg(14.55, 47.52),
  BY: toSvg(27.95, 53.71),
  BE: toSvg(4.47, 50.5),
  BA: toSvg(17.68, 43.92),
  BG: toSvg(25.49, 42.73),
  HR: toSvg(15.2, 45.1),
  CZ: toSvg(15.47, 49.82),
  DK: toSvg(9.5, 56.26),
  EE: toSvg(25.01, 58.6),
  FI: toSvg(25.75, 61.92),
  FR: toSvg(2.21, 46.23),
  DE: toSvg(10.45, 51.17),
  GR: toSvg(21.82, 39.07),
  HU: toSvg(19.5, 47.16),
  IS: toSvg(-19.02, 64.96),
  IE: toSvg(-7.69, 53.14),
  IT: toSvg(12.57, 41.87),
  LV: toSvg(24.6, 56.88),
  LT: toSvg(23.88, 55.17),
  LU: toSvg(6.13, 49.82),
  MT: toSvg(14.38, 35.94),
  MD: toSvg(28.37, 47.41),
  ME: toSvg(19.37, 42.71),
  NL: toSvg(5.29, 52.13),
  MK: toSvg(21.75, 41.51),
  NO: toSvg(8.47, 60.47),
  PL: toSvg(19.15, 51.92),
  PT: toSvg(-8.22, 39.4),
  RO: toSvg(24.97, 45.94),
  RU: toSvg(105.32, 61.52),
  RS: toSvg(21.01, 44.02),
  SK: toSvg(19.7, 48.67),
  SI: toSvg(14.99, 46.15),
  ES: toSvg(-3.75, 40.46),
  SE: toSvg(18.64, 60.13),
  CH: toSvg(8.23, 46.82),
  UA: toSvg(31.17, 48.38),
  GB: toSvg(-3.44, 55.38),

  // North America
  BS: toSvg(-77.4, 25.03),
  BB: toSvg(-59.54, 13.19),
  BZ: toSvg(-88.5, 17.19),
  CA: toSvg(-106.35, 56.13),
  CR: toSvg(-83.75, 9.75),
  CU: toSvg(-77.78, 21.52),
  DO: toSvg(-70.16, 18.74),
  SV: toSvg(-88.9, 13.79),
  GT: toSvg(-90.23, 15.78),
  HT: toSvg(-72.29, 18.97),
  HN: toSvg(-86.24, 15.2),
  JM: toSvg(-77.3, 18.11),
  MX: toSvg(-102.55, 23.63),
  NI: toSvg(-85.21, 12.87),
  PA: toSvg(-80.78, 8.54),
  TT: toSvg(-61.22, 10.69),
  US: toSvg(-95.71, 37.09),

  // South America
  AR: toSvg(-63.62, -38.42),
  BO: toSvg(-63.59, -16.29),
  BR: toSvg(-51.93, -14.24),
  CL: toSvg(-71.54, -35.68),
  CO: toSvg(-74.3, 4.57),
  EC: toSvg(-78.18, -1.83),
  GY: toSvg(-58.93, 4.86),
  PY: toSvg(-58.44, -23.44),
  PE: toSvg(-75.02, -9.19),
  SR: toSvg(-56.03, 3.92),
  UY: toSvg(-55.77, -32.52),
  VE: toSvg(-66.59, 6.42),

  // Oceania
  AU: toSvg(133.78, -25.27),
  FJ: toSvg(178.07, -17.71),
  NZ: toSvg(174.89, -40.9),
  PG: toSvg(143.96, -6.31),
};
