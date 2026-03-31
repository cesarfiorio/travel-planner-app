/** Stored in DB on community_routes.tags (max 3). */
export const COMMUNITY_TAG_IDS = [
  'food',
  'culture',
  'adventure',
  'family',
  'couple',
  'budget',
  'luxury',
  'solo',
] as const;

export type CommunityTagId = (typeof COMMUNITY_TAG_IDS)[number];

export const TRAVEL_STYLE_IDS = ['solo', 'couple', 'family', 'group', 'backpacker'] as const;

export type TravelStyleId = (typeof TRAVEL_STYLE_IDS)[number];
