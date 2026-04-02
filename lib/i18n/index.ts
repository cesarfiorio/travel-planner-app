import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import deAuth from '../../locales/de/auth.json';
import deCommon from '../../locales/de/common.json';
import deCommunity from '../../locales/de/community.json';
import deExpenses from '../../locales/de/expenses.json';
import deExplore from '../../locales/de/explore.json';
import deMemory from '../../locales/de/memory.json';
import deMembers from '../../locales/de/members.json';
import dePaywall from '../../locales/de/paywall.json';
import deProfile from '../../locales/de/profile.json';
import deTrips from '../../locales/de/trips.json';
import deMap from '../../locales/de/map.json';
import deShare from '../../locales/de/share.json';
import enAuth from '../../locales/en/auth.json';
import enCommon from '../../locales/en/common.json';
import enCommunity from '../../locales/en/community.json';
import enExpenses from '../../locales/en/expenses.json';
import enExplore from '../../locales/en/explore.json';
import enMemory from '../../locales/en/memory.json';
import enMembers from '../../locales/en/members.json';
import enPaywall from '../../locales/en/paywall.json';
import enProfile from '../../locales/en/profile.json';
import enTrips from '../../locales/en/trips.json';
import enMap from '../../locales/en/map.json';
import enShare from '../../locales/en/share.json';
import esAuth from '../../locales/es/auth.json';
import esCommon from '../../locales/es/common.json';
import esCommunity from '../../locales/es/community.json';
import esExpenses from '../../locales/es/expenses.json';
import esExplore from '../../locales/es/explore.json';
import esMemory from '../../locales/es/memory.json';
import esMembers from '../../locales/es/members.json';
import esPaywall from '../../locales/es/paywall.json';
import esProfile from '../../locales/es/profile.json';
import esTrips from '../../locales/es/trips.json';
import esMap from '../../locales/es/map.json';
import esShare from '../../locales/es/share.json';
import frAuth from '../../locales/fr/auth.json';
import frCommon from '../../locales/fr/common.json';
import frCommunity from '../../locales/fr/community.json';
import frExpenses from '../../locales/fr/expenses.json';
import frExplore from '../../locales/fr/explore.json';
import frMemory from '../../locales/fr/memory.json';
import frMembers from '../../locales/fr/members.json';
import frPaywall from '../../locales/fr/paywall.json';
import frProfile from '../../locales/fr/profile.json';
import frTrips from '../../locales/fr/trips.json';
import frMap from '../../locales/fr/map.json';
import frShare from '../../locales/fr/share.json';
import itAuth from '../../locales/it/auth.json';
import itCommon from '../../locales/it/common.json';
import itCommunity from '../../locales/it/community.json';
import itExpenses from '../../locales/it/expenses.json';
import itExplore from '../../locales/it/explore.json';
import itMemory from '../../locales/it/memory.json';
import itMembers from '../../locales/it/members.json';
import itPaywall from '../../locales/it/paywall.json';
import itProfile from '../../locales/it/profile.json';
import itTrips from '../../locales/it/trips.json';
import itMap from '../../locales/it/map.json';
import itShare from '../../locales/it/share.json';
import ptAuth from '../../locales/pt/auth.json';
import ptCommon from '../../locales/pt/common.json';
import ptCommunity from '../../locales/pt/community.json';
import ptExpenses from '../../locales/pt/expenses.json';
import ptExplore from '../../locales/pt/explore.json';
import ptMemory from '../../locales/pt/memory.json';
import ptMembers from '../../locales/pt/members.json';
import ptPaywall from '../../locales/pt/paywall.json';
import ptProfile from '../../locales/pt/profile.json';
import ptTrips from '../../locales/pt/trips.json';
import ptMap from '../../locales/pt/map.json';
import ptShare from '../../locales/pt/share.json';

import './types';

const LANGUAGE_STORAGE_KEY = '@routeflow/language';

export const SUPPORTED_LANGUAGE_CODES = ['en', 'pt', 'es', 'it', 'de', 'fr'] as const;
export type AppLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

const namespaces = [
  'common',
  'auth',
  'trips',
  'explore',
  'expenses',
  'community',
  'profile',
  'paywall',
  'memory',
  'members',
  'map',
  'share',
] as const;

function bundle(
  common: typeof enCommon,
  auth: typeof enAuth,
  trips: typeof enTrips,
  explore: typeof enExplore,
  expenses: typeof enExpenses,
  community: typeof enCommunity,
  profile: typeof enProfile,
  paywall: typeof enPaywall,
  memory: typeof enMemory,
  members: typeof enMembers,
  map: typeof enMap,
  share: typeof enShare,
) {
  return {
    common,
    auth,
    trips,
    explore,
    expenses,
    community,
    profile,
    paywall,
    memory,
    members,
    map,
    share,
  };
}

const resources = {
  en: bundle(enCommon, enAuth, enTrips, enExplore, enExpenses, enCommunity, enProfile, enPaywall, enMemory, enMembers, enMap, enShare),
  pt: bundle(ptCommon, ptAuth, ptTrips, ptExplore, ptExpenses, ptCommunity, ptProfile, ptPaywall, ptMemory, ptMembers, ptMap, ptShare),
  es: bundle(esCommon, esAuth, esTrips, esExplore, esExpenses, esCommunity, esProfile, esPaywall, esMemory, esMembers, esMap, esShare),
  it: bundle(itCommon, itAuth, itTrips, itExplore, itExpenses, itCommunity, itProfile, itPaywall, itMemory, itMembers, itMap, itShare),
  de: bundle(deCommon, deAuth, deTrips, deExplore, deExpenses, deCommunity, deProfile, dePaywall, deMemory, deMembers, deMap, deShare),
  fr: bundle(frCommon, frAuth, frTrips, frExplore, frExpenses, frCommunity, frProfile, frPaywall, frMemory, frMembers, frMap, frShare),
} as const;

export function isAppLanguageCode(value: string): value is AppLanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value);
}

function normalizeDeviceLanguage(): AppLanguageCode {
  const locales = Localization.getLocales();
  const primary = locales[0];
  if (!primary) {
    return 'en';
  }
  const tag = (primary.languageTag ?? '').toLowerCase();
  const code = (primary.languageCode ?? 'en').toLowerCase();
  if (code === 'pt' || tag.startsWith('pt')) {
    return 'pt';
  }
  if (code === 'es' || tag.startsWith('es')) {
    return 'es';
  }
  if (code === 'it' || tag.startsWith('it')) {
    return 'it';
  }
  if (code === 'de' || tag.startsWith('de')) {
    return 'de';
  }
  if (code === 'fr' || tag.startsWith('fr')) {
    return 'fr';
  }
  if (isAppLanguageCode(code)) {
    return code;
  }
  return 'en';
}

async function resolveInitialLanguage(): Promise<AppLanguageCode> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isAppLanguageCode(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return normalizeDeviceLanguage();
}

void i18n.use(initReactI18next).init({
  resources: { ...resources },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...namespaces],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  compatibilityJSON: 'v4',
});

void (async () => {
  const lng = await resolveInitialLanguage();
  await i18n.changeLanguage(lng);
})();

export async function setAppLanguage(lng: AppLanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

/** @deprecated Prefer setAppLanguage — kept for mission API parity */
export const changeLanguage = setAppLanguage;

export { i18n };
export const t = i18n.t.bind(i18n);
