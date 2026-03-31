import type { ReactNode } from 'react';

import { useSubscription } from '../lib/hooks/useSubscription';
import type { PlanRequirement } from '../lib/planAccess';

import { LockedBanner } from './LockedBanner';

export type PlanGateFeatureId =
  | 'pdfExport'
  | 'tripMemoryJournal'
  | 'unlimitedTrips'
  | 'shareJournal'
  | 'finishMemory'
  | string;

type PlanGateProps = {
  requires: PlanRequirement;
  /** Used when `fallback` is omitted to build a default `LockedBanner`. */
  feature?: PlanGateFeatureId;
  children?: ReactNode;
  /** Pass `null` to render nothing when locked. Omit to use default `LockedBanner` when `feature` is set. */
  fallback?: ReactNode;
};

export function PlanGate({ requires, feature, children = null, fallback }: PlanGateProps) {
  const { isExplorer } = useSubscription();
  const allowed = requires === 'explorer' ? isExplorer : false;
  if (allowed) {
    return children;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return <LockedBanner message="" featureId={feature} />;
}
