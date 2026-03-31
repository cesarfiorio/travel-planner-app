export type PlanRequirement = 'explorer';

/** Explorer-tier features: Plus, Pro, or explicit explorer plan label. */
export function hasPlanAccess(plan: string | undefined, required: PlanRequirement): boolean {
  const p = (plan ?? 'free').toLowerCase();
  if (required === 'explorer') {
    return p === 'plus' || p === 'pro' || p === 'explorer';
  }
  return false;
}

/** Supabase profile row: explorer plan with optional webhook-synced expiry. */
export function profileHasExplorerAccess(
  profile: { plan: string; plan_expires_at?: string | null } | null | undefined,
): boolean {
  if (!profile) {
    return false;
  }
  if (!hasPlanAccess(profile.plan, 'explorer')) {
    return false;
  }
  if (profile.plan_expires_at) {
    return new Date(profile.plan_expires_at) > new Date();
  }
  return true;
}
