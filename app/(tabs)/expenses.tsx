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

const SCREEN_BG = '#F8F9FA';
const ORANGE = '#F05A1A';

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
      <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('noTripTitle')}</Text>
        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('noTripBody')}</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/home')}
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 12,
            paddingHorizontal: 18,
            backgroundColor: ORANGE,
            borderRadius: 12,
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('goHome')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }} numberOfLines={2}>
          {t('screenTitle')}
        </Text>
        <TripSwitcher variant="icon" />
      </View>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: '#6B7280', paddingHorizontal: 20, marginBottom: 16 }} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : (
        <View style={{ marginBottom: 16 }} />
      )}

      {isPending && expenses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={ORANGE} size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.inactive, textAlign: 'center', marginBottom: 16 }}>{t('errorLoad')}</Text>
          <Pressable
            onPress={() => void refetch()}
            style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: ORANGE, borderRadius: 12 }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={recentExpenses}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />}
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
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{t('recentExpenses')}</Text>
                  <Pressable
                    onPress={() => router.push(`/trip/${tripId}/add-expense`)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: ORANGE,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('addExpenseFabA11y')}
                  >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                  </Pressable>
                </View>
              </>
            }
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.inactive, paddingVertical: 32, paddingHorizontal: 28 }}>
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
            contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
          />

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(16, insets.bottom + 8),
              backgroundColor: SCREEN_BG,
              borderTopWidth: 1,
              borderTopColor: '#E8EAED',
            }}
          >
            <Pressable
              onPress={onSettleUp}
              style={{
                paddingVertical: 16,
                borderRadius: 999,
                backgroundColor: ORANGE,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 4,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('settleUp')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>{t('settleUpCta')}</Text>
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
