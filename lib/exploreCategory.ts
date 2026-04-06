import type explore from '../locales/en/explore.json';

export type ExploreLocaleKey = keyof typeof explore;

const MAP: Record<string, ExploreLocaleKey> = {
  restaurants: 'category_restaurants',
  attractions: 'category_attractions',
  outdoor: 'category_outdoor',
  nightlife: 'category_nightlife',
  shopping: 'category_shopping',
  accommodation: 'category_accommodation',
};

/** Singular label on place card image badge (e.g. "Attraction"). */
const BADGE_MAP: Record<string, ExploreLocaleKey> = {
  restaurants: 'placeBadge_restaurants',
  attractions: 'placeBadge_attractions',
  outdoor: 'placeBadge_outdoor',
  nightlife: 'placeBadge_nightlife',
  shopping: 'placeBadge_shopping',
  accommodation: 'placeBadge_accommodation',
};

export function placeCategoryExploreKey(category: string | null | undefined): ExploreLocaleKey | null {
  if (!category?.trim()) {
    return null;
  }
  return MAP[category] ?? null;
}

export function placeCategoryBadgeKey(category: string | null | undefined): ExploreLocaleKey | null {
  if (!category?.trim()) {
    return null;
  }
  return BADGE_MAP[category] ?? null;
}
