export function formatPriceLevel(level: number | null | undefined): string {
  if (level == null || Number.isNaN(Number(level))) {
    return '';
  }
  const n = Math.min(4, Math.max(0, Math.round(Number(level))));
  return ['$', '$$', '$$$', '$$$$', '$$$$$'][n] ?? '';
}
