import type { ReactNode } from 'react';

import { useProfile } from '../lib/hooks/useProfile';
import { hasPlanAccess, type PlanRequirement } from '../lib/planAccess';

type PlanGateProps = {
  requires: PlanRequirement;
  children?: ReactNode;
  fallback: ReactNode;
};

export function PlanGate({ requires, children = null, fallback }: PlanGateProps) {
  const { data: profile } = useProfile();
  const allowed = hasPlanAccess(profile?.plan, requires);
  return allowed ? children : fallback;
}
