import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ExpensePreviewCard } from '../../components/ExpensePreviewCard';
import { ExpensesBalancesCard } from '../../components/ExpensesBalancesCard';
import { SettleDebtModal } from '../../components/SettleDebtModal';
import { TripSwitcher } from '../../components/TripSwitcher';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import { useAuth } from '../../lib/hooks/useAuth';
import { useTripExpenses, useSettleDebt, type ExpenseWithSplits } from '../../lib/hooks/useExpenses';
import { useTrip } from '../../lib/hooks/useTrips';
import type { MemberProfileBrief } from '../../lib/hooks/useTrips';
import { formatItineraryDestinationSubtitle } from '../../lib/itinerary/itinerarySubtitle';
import { useAppStore } from '../../lib/store/appStore';
import { groupExpensesByCurrency } from '../../lib/utils/expenseBalanceGroups';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import type { SimplifiedDebt } from '../../lib/utils/splitCalculator';

export default function ExpensesScreen() {
  const { t } = useTranslation('expenses');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const { user } = useAuth();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const tripId = activeTrip?.id;
  const { data: trip } = useTrip(tripId);
  const {
    data: expenses = [],
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useTripExpenses(tripId);
  const settleMutation = useSettleDebt(tripId);

  const [settleTarget, setSettleTarget] = useState<SimplifiedDebt | null>(null);

  const profileById = useMemo(() => {
    const m = new Map<string, MemberProfileBrief>();
    if (!trip) {
      return m;
    }
    for (const p of trip.memberProfiles ?? []) {
      m.set(p.id, p);
    }
    return m;
  }, [trip]);

  const memberIds = useMemo(() => {
    if (!trip) {
      return [];
    }
    const ids = new Set<string>();
    ids.add(trip.created_by);
    for (const m of trip.trip_members ?? []) {
      ids.add(m.user_id);
    }
    return [...ids];
  }, [trip]);

  const currency = useMemo(() => expenses[0]?.currency ?? trip?.default_currency ?? 'USD', [expenses, trip?.default_currency]);

  const recentExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const da = `${a.expense_date}T${a.created_at ?? ''}`;
      const db = `${b.expense_date}T${b.created_at ?? ''}`;
      return da < db ? 1 : da > db ? -1 : 0;
    });
  }, [expenses]);

  const firstDebt = useMemo(() => {
    const g = groupExpensesByCurrency(expenses)[0];
    return g?.simplified[0] ?? null;
  }, [expenses]);

  const subtitle = useMemo(
    () => formatItineraryDestinationSubtitle(activeTrip?.destination_label, activeTrip?.name),
    [activeTrip?.destination_label, activeTrip?.name],
  );

  const handleEdit = (expense: ExpenseWithSplits) => {
    if (!tripId) {
      return;
    }
    router.push(`/trip/${tripId}/add-expense?expenseId=${expense.id}`);
  };

  const uid = user?.id ?? '';

  const settleCreditorName =
    settleTarget && trip
      ? settleTarget.to === uid
        ? t('you')
        : profileById.get(settleTarget.to)?.display_name?.trim() ||
          profileById.get(settleTarget.to)?.full_name?.trim() ||
          t('memberFallback')
      : '';

  const settleAmountLabel =
    settleTarget ? formatCurrency(settleTarget.cents, settleTarget.currency ?? currency, locale) : '';

  const onSettleUp = () => {
    if (expenses.length === 0) {
      Alert.alert(t('settleUp'), t('settleUpNeedExpenses'));
      return;
    }
    if (!firstDebt) {
      Alert.alert(t('settleUp'), t('allSettledBody'));
      return;
    }
    setSettleTarget(firstDebt);
  };

  if (!activeTrip || !tripId) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.pageBg, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: colors.text, marginBottom: 12 }}>{t('noTripTitle')}</Text>
        <Text style={{ fontSize: FONT.md, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('noTripBody')}</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/home')}
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 12,
            paddingHorizontal: 18,
            backgroundColor: COLORS.primary,
            borderRadius: RADIUS.lg,
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimary, fontWeight: FONT.bold }}>{t('goHome')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.pageBg }}>
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 24, fontWeight: FONT.bold, color: COLORS.textPrimary, letterSpacing: -0.3 }}
            numberOfLines={2}
          >
            {t('screenTitle')}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <TripSwitcher variant="icon" />
      </View>

      {isPending && expenses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.inactive, textAlign: 'center', marginBottom: 16 }}>{t('errorLoad')}</Text>
          <Pressable
            onPress={() => void refetch()}
            style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: FONT.semibold }}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={recentExpenses}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
            ListHeaderComponent={
              <>
                {trip && uid ? (
                  <ExpensesBalancesCard
                    expenses={expenses}
                    profileById={profileById}
                    memberIds={memberIds}
                    currentUserId={uid}
                  />
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary }}>{t('recentExpenses')}</Text>
                  <Pressable
                    onPress={() => router.push(`/trip/${tripId}/add-expense`)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: COLORS.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...SHADOW.md,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('addExpenseFabA11y')}
                  >
                    <Ionicons name="add" size={26} color={COLORS.textOnPrimary} />
                  </Pressable>
                </View>
              </>
            }
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 32, paddingHorizontal: 28 }}>
                {t('emptyList')}
              </Text>
            }
            renderItem={({ item }) => (
              <ExpensePreviewCard
                expense={item}
                paidByProfile={profileById.get(item.paid_by_user_id)}
                profileById={profileById}
                onPress={() => handleEdit(item)}
              />
            )}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 12,
            }}
          />

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: Math.min(12, insets.bottom + 8),
              backgroundColor: COLORS.pageBg,
            }}
          >
            <Pressable
              onPress={onSettleUp}
              style={{
                paddingVertical: 14,
                borderRadius: RADIUS.pill,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                ...SHADOW.pill,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('settleUp')}
            >
              <Text style={{ color: COLORS.textOnPrimary, fontSize: FONT.lg, fontWeight: FONT.bold }}>{t('settleUpCta')}</Text>
            </Pressable>
          </View>
        </>
      )}

      <SettleDebtModal
        visible={settleTarget !== null}
        debt={settleTarget}
        creditorName={settleCreditorName}
        amountLabel={settleAmountLabel}
        confirming={settleMutation.isPending}
        onClose={() => !settleMutation.isPending && setSettleTarget(null)}
        onConfirm={() => {
          if (!settleTarget) {
            return;
          }
          settleMutation.mutate(
            {
              debtorUserId: settleTarget.from,
              creditorUserId: settleTarget.to,
            },
            {
              onSuccess: () => setSettleTarget(null),
              onError: (e) => Alert.alert(t('errorLoad'), formatErrorMessage(e, t('errorSave'))),
            },
          );
        }}
      />
    </View>
  );
}
