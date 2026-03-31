import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import { profileHasExplorerAccess } from '../planAccess';
import { hasSupabaseEnv, supabase } from '../supabase';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { useAuth } from './useAuth';
import { profileQueryKey, useProfile } from './useProfile';

export const ENTITLEMENT_EXPLORER = 'explorer';
export const PRODUCT_ANNUAL = 'routeflow_explorer_annual';
export const PRODUCT_MONTHLY = 'routeflow_explorer_monthly';

/** Free tier: max trips the user can own as creator. */
export const FREE_OWNER_TRIP_LIMIT = 1;

/**
 * When `EXPO_PUBLIC_DEV_GRANT_EXPLORER=1` and Metro `__DEV__` is true, treat the user as Explorer
 * (gates + trip limit). No effect in release builds. Use in Expo Go / without RevenueCat.
 */
export function devGrantExplorerAccess(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEV_GRANT_EXPLORER === '1';
}

type PurchasesModule = typeof import('react-native-purchases').default;

let revenueCatConfigured = false;

/** RevenueCat needs a dev/standalone build with the native SDK; Expo Go uses a broken “browser” stub. */
function isRevenueCatNativeAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function loadPurchases(): PurchasesModule | null {
  if (!isRevenueCatNativeAvailable()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases').default as PurchasesModule;
  } catch {
    return null;
  }
}

function revenueCatApiKey(): string | undefined {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim();
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim();
  }
  return undefined;
}

function ensureConfigured(Purchases: PurchasesModule): void {
  if (revenueCatConfigured) {
    return;
  }
  const key = revenueCatApiKey();
  if (!key) {
    return;
  }
  Purchases.configure({ apiKey: key });
  revenueCatConfigured = true;
}

export const customerInfoQueryKey = (userId: string) => ['purchases', 'customerInfo', userId] as const;

function pickAnnualPackage(current: PurchasesOffering | null): PurchasesPackage | null {
  if (!current) {
    return null;
  }
  const byProduct = current.availablePackages.find((p) => p.product.identifier === PRODUCT_ANNUAL);
  if (byProduct) {
    return byProduct;
  }
  return current.annual;
}

function pickMonthlyPackage(current: PurchasesOffering | null): PurchasesPackage | null {
  if (!current) {
    return null;
  }
  const byProduct = current.availablePackages.find((p) => p.product.identifier === PRODUCT_MONTHLY);
  if (byProduct) {
    return byProduct;
  }
  return current.monthly;
}

export function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const Purchases = useMemo(() => loadPurchases(), []);
  const prevUserId = useRef<string | null>(null);

  const rcEnabled = Boolean(
    Purchases && userId && (Platform.OS === 'ios' || Platform.OS === 'android') && revenueCatApiKey(),
  );

  useEffect(() => {
    if (!Purchases) {
      return;
    }
    ensureConfigured(Purchases);
  }, [Purchases]);

  useEffect(() => {
    if (!Purchases || !rcEnabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await Purchases.logIn(userId);
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: customerInfoQueryKey(userId) });
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[useSubscription] logIn failed', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [Purchases, rcEnabled, userId, queryClient]);

  useEffect(() => {
    if (!Purchases) {
      return;
    }
    if (prevUserId.current && !userId) {
      void Purchases.logOut().catch(() => {});
    }
    prevUserId.current = userId || null;
  }, [Purchases, userId]);

  const customerInfoQuery = useQuery({
    queryKey: customerInfoQueryKey(userId),
    enabled: rcEnabled,
    queryFn: async (): Promise<CustomerInfo | null> => {
      if (!Purchases) {
        return null;
      }
      const info = await Purchases.getCustomerInfo();
      return info;
    },
  });

  const { data: profileRow } = useProfile();

  const isExplorer = useMemo(() => {
    if (devGrantExplorerAccess()) {
      return true;
    }
    const active = customerInfoQuery.data?.entitlements.active[ENTITLEMENT_EXPLORER];
    if (active) {
      return true;
    }
    return profileHasExplorerAccess(profileRow);
  }, [customerInfoQuery.data, profileRow]);

  const invalidateAfterPurchase = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: customerInfoQueryKey(userId) });
    if (userId && hasSupabaseEnv && supabase) {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    }
  }, [queryClient, userId]);

  const purchaseAnnual = useCallback(async (): Promise<CustomerInfo> => {
    const P = loadPurchases();
    if (!P) {
      throw new Error('Purchases not available on this platform');
    }
    ensureConfigured(P);
    const offerings = await P.getOfferings();
    const pkg = pickAnnualPackage(offerings.current);
    if (!pkg) {
      throw new Error('Annual package not found. Check RevenueCat default offering.');
    }
    const { customerInfo } = await P.purchasePackage(pkg);
    await invalidateAfterPurchase();
    return customerInfo;
  }, [invalidateAfterPurchase]);

  const purchaseMonthly = useCallback(async (): Promise<CustomerInfo> => {
    const P = loadPurchases();
    if (!P) {
      throw new Error('Purchases not available on this platform');
    }
    ensureConfigured(P);
    const offerings = await P.getOfferings();
    const pkg = pickMonthlyPackage(offerings.current);
    if (!pkg) {
      throw new Error('Monthly package not found. Check RevenueCat default offering.');
    }
    const { customerInfo } = await P.purchasePackage(pkg);
    await invalidateAfterPurchase();
    return customerInfo;
  }, [invalidateAfterPurchase]);

  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    const P = loadPurchases();
    if (!P) {
      throw new Error('Purchases not available on this platform');
    }
    ensureConfigured(P);
    const customerInfo = await P.restorePurchases();
    await invalidateAfterPurchase();
    return customerInfo;
  }, [invalidateAfterPurchase]);

  const getCurrentOffering = useCallback(async (): Promise<PurchasesOffering | null> => {
    const P = loadPurchases();
    if (!P) {
      return null;
    }
    ensureConfigured(P);
    const offerings = await P.getOfferings();
    return offerings.current ?? null;
  }, []);

  return {
    isExplorer,
    purchaseAnnual,
    purchaseMonthly,
    restorePurchases,
    getCurrentOffering,
    customerInfo: customerInfoQuery.data ?? null,
    isLoadingCustomerInfo: customerInfoQuery.isLoading,
    purchasesAvailable: rcEnabled,
  };
}
