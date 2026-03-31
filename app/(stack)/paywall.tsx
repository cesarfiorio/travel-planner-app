import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { PurchasesOffering } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import {
  founderDaysRemaining,
  useFounderOfferActive,
  useFounderOfferEndsAt,
} from '../../lib/hooks/useFounderOffer';
import {
  ENTITLEMENT_EXPLORER,
  PRODUCT_ANNUAL,
  PRODUCT_MONTHLY,
  useSubscription,
} from '../../lib/hooks/useSubscription';

function isUserCancelled(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'userCancelled' in e &&
    (e as { userCancelled?: boolean }).userCancelled === true
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('paywall');
  const { data: founderEndsAt } = useFounderOfferEndsAt();
  const founderActive = useFounderOfferActive();
  const daysLeft = founderEndsAt ? founderDaysRemaining(founderEndsAt) : 0;

  const { getCurrentOffering, purchaseAnnual, purchaseMonthly, restorePurchases, purchasesAvailable } = useSubscription();

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [busy, setBusy] = useState<'annual' | 'monthly' | 'restore' | null>(null);

  const reloadOffering = useCallback(async () => {
    setLoadingOffering(true);
    try {
      const o = await getCurrentOffering();
      setOffering(o);
    } finally {
      setLoadingOffering(false);
    }
  }, [getCurrentOffering]);

  useFocusEffect(
    useCallback(() => {
      void reloadOffering();
    }, [reloadOffering]),
  );

  const annualPkg = useMemo(() => {
    if (!offering) {
      return null;
    }
    return (
      offering.availablePackages.find((p) => p.product.identifier === PRODUCT_ANNUAL) ?? offering.annual ?? null
    );
  }, [offering]);

  const monthlyPkg = useMemo(() => {
    if (!offering) {
      return null;
    }
    return (
      offering.availablePackages.find((p) => p.product.identifier === PRODUCT_MONTHLY) ?? offering.monthly ?? null
    );
  }, [offering]);

  const annualStorePrice = annualPkg?.product.priceString ?? '';
  const monthlyStorePrice = monthlyPkg?.product.priceString ?? '';

  const runPurchase = async (kind: 'annual' | 'monthly') => {
    setBusy(kind);
    try {
      if (kind === 'annual') {
        await purchaseAnnual();
      } else {
        await purchaseMonthly();
      }
      router.back();
    } catch (e) {
      if (isUserCancelled(e)) {
        return;
      }
      Alert.alert(t('errorTitle'), formatErrorMessage(e, t('errorPurchase')));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    try {
      const info = await restorePurchases();
      if (info.entitlements.active[ENTITLEMENT_EXPLORER]) {
        router.back();
      } else {
        Alert.alert(t('restoreTitle'), t('restoreNothing'));
      }
    } catch (e) {
      if (isUserCancelled(e)) {
        return;
      }
      Alert.alert(t('errorTitle'), formatErrorMessage(e, t('errorRestore')));
    } finally {
      setBusy(null);
    }
  };

  const features = [
    t('features.trips'),
    t('features.places'),
    t('features.expenses'),
    t('features.community'),
    t('features.memory'),
    t('features.cards'),
    t('features.pdf'),
    t('features.offline'),
  ];

  const webOrNoKeys = Platform.OS === 'web' || !purchasesAvailable;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <Pressable
        onPress={() => router.back()}
        style={{ marginBottom: 16, paddingHorizontal: 20, alignSelf: 'flex-start' }}
        accessibilityRole="button"
        accessibilityLabel={t('goBackA11y')}
      >
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>{t('back')}</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{t('header')}</Text>

        {founderActive && founderEndsAt ? (
          <View
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              backgroundColor: '#FFF7ED',
              borderWidth: 1,
              borderColor: '#FDBA74',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#9A3412', marginBottom: 6 }}>{t('founderBanner')}</Text>
            <Text style={{ fontSize: 14, color: '#C2410C' }}>{t('founderCountdown', { count: daysLeft })}</Text>
          </View>
        ) : null}

        {webOrNoKeys ? (
          <Text style={{ fontSize: 15, color: colors.inactive, lineHeight: 22, marginBottom: 20 }}>{t('nativeOnly')}</Text>
        ) : loadingOffering ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primarySolid} />
          </View>
        ) : null}

        <View
          style={{
            padding: 20,
            borderRadius: 16,
            backgroundColor: '#FFF7ED',
            borderWidth: 2,
            borderColor: colors.primarySolid,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{t('annualTitle')}</Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primarySolid }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.onPrimary }}>{t('mostPopular')}</Text>
            </View>
          </View>
          {founderActive ? (
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: colors.inactive, textDecorationLine: 'line-through' }}>{t('annualList')}</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>{t('annualFounderPrice')}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 6 }}>
              {annualStorePrice || t('annualList')}
            </Text>
          )}
          <Text style={{ fontSize: 15, color: colors.inactive, lineHeight: 22 }}>{t('annualSubtext')}</Text>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: '#F3F4F6',
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{t('monthlyTitle')}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {monthlyStorePrice || t('monthlyList')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 6 }}>{t('monthlySub')}</Text>
        </View>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{t('includes')}</Text>
        {features.map((line) => (
          <Text key={line} style={{ fontSize: 15, color: colors.text, marginBottom: 8, lineHeight: 22 }}>
            ✓ {line}
          </Text>
        ))}

        <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 16, lineHeight: 18 }}>{t('founderPricingNote')}</Text>

        <Pressable
          onPress={() => void runPurchase('annual')}
          disabled={webOrNoKeys || busy !== null || !annualPkg}
          style={({ pressed }) => ({
            marginTop: 24,
            paddingVertical: 18,
            borderRadius: 14,
            backgroundColor: colors.primarySolid,
            alignItems: 'center',
            opacity: webOrNoKeys || !annualPkg || busy ? 0.5 : pressed ? 0.92 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('ctaAnnualA11y')}
        >
          {busy === 'annual' ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.onPrimary }}>{t('ctaAnnual')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => void runPurchase('monthly')}
          disabled={webOrNoKeys || busy !== null || !monthlyPkg}
          style={{ marginTop: 14, paddingVertical: 12, alignItems: 'center', opacity: !monthlyPkg ? 0.45 : 1 }}
          accessibilityRole="button"
        >
          {busy === 'monthly' ? (
            <ActivityIndicator color={colors.primarySolid} />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primarySolid }}>{t('ctaMonthly')}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => void onRestore()} disabled={webOrNoKeys || busy !== null} style={{ marginTop: 20, alignItems: 'center' }}>
          {busy === 'restore' ? (
            <ActivityIndicator color={colors.inactive} />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inactive }}>{t('restore')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
