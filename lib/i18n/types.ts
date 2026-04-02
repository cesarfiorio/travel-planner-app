import type auth from '../../locales/en/auth.json';
import type common from '../../locales/en/common.json';
import type community from '../../locales/en/community.json';
import type expenses from '../../locales/en/expenses.json';
import type explore from '../../locales/en/explore.json';
import type members from '../../locales/en/members.json';
import type memory from '../../locales/en/memory.json';
import type paywall from '../../locales/en/paywall.json';
import type profile from '../../locales/en/profile.json';
import type trips from '../../locales/en/trips.json';
import type map from '../../locales/en/map.json';
import type share from '../../locales/en/share.json';

export type TranslationNamespaces = {
  common: typeof common;
  auth: typeof auth;
  trips: typeof trips;
  explore: typeof explore;
  members: typeof members;
  expenses: typeof expenses;
  community: typeof community;
  profile: typeof profile;
  paywall: typeof paywall;
  memory: typeof memory;
  map: typeof map;
  share: typeof share;
};

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: TranslationNamespaces;
  }
}
