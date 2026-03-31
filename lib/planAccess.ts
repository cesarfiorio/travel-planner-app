export type PlanRequirement = 'explorer';

/** Explorer-tier features: Plus, Pro, or explicit explorer plan label. */
export function hasPlanAccess(plan: string | undefined, required: PlanRequirement): boolean {
  const p = (plan ?? 'free').toLowerCase();
  if (required === 'explorer') {
    return p === 'plus' || p === 'pro' || p === 'explorer';
  }
  return false;
}
