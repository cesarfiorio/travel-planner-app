import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BalanceSummary } from '../../components/BalanceSummary';
import { ExpenseItem } from '../../components/ExpenseItem';
import { TripSwitcher } from '../../components/TripSwitcher';
import { colors } from '../../constants/colors';
import { useAuth } from '../../lib/hooks/useAuth';
import { useTripExpenses } from '../../lib/hooks/useExpenses';
import { useTrip } from '../../lib/hooks/useTrips';
import type { MemberProfileBrief } from '../../lib/hooks/useTrips';
import { useAppStore } from '../../lib/store/appStore';
import { calculateBalances, simplifyDebts } from '../../lib/utils/splitCalculator';

export default function ExpensesScreen() {
  const { t } = useTranslation('expenses');
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  const { balances, simplified, currency } = useMemo(() => {
    const cur = expenses[0]?.currency ?? 'EUR';
    const expPart = expenses.map((e) => ({
      id: e.id,
      paid_by_user_id: e.paid_by_user_id,
      amount_cents: e.amount_cents,
    }));
    const splitPart = expenses.flatMap((e) =>
      (e.expense_splits ?? []).map((s) => ({
        expense_id: e.id,
        user_id: s.user_id,
        amount_owed_cents: s.amount_owed_cents,
      })),
    );
    const bal = calculateBalances(expPart, splitPart);
    const sim = simplifyDebts(bal);
    return { balances: bal, simplified: sim, currency: cur };
  }, [expenses]);

  if (!activeTrip || !tripId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('noTripTitle')}</Text>
        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('noTripBody')}</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/home')}
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 12,
            paddingHorizontal: 18,
            backgroundColor: colors.primarySolid,
            borderRadius: 12,
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('goHome')}</Text>
        </Pressable>
      </View>
    );
  }

  const uid = user?.id ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: colors.text }} numberOfLines={1}>
          {t('screenTitle')}
        </Text>
        <TripSwitcher variant="icon" />
      </View>

      {isPending && expenses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primarySolid} size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.inactive, textAlign: 'center', marginBottom: 16 }}>{t('errorLoad')}</Text>
          <Pressable
            onPress={() => void refetch()}
            style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.primarySolid, borderRadius: 12 }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          ListHeaderComponent={
            trip && uid ? (
              <BalanceSummary
                balances={balances}
                simplified={simplified}
                profileById={profileById}
                currency={currency}
                currentUserId={uid}
                memberIds={memberIds}
              />
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.inactive, paddingVertical: 32, paddingHorizontal: 24 }}>
              {t('emptyList')}
            </Text>
          }
          renderItem={({ item }) => (
            <ExpenseItem
              expense={item}
              paidByProfile={profileById.get(item.paid_by_user_id)}
              profileById={profileById}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
        />
      )}

      <Pressable
        onPress={() => router.push(`/trip/${tripId}/add-expense`)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: Math.max(insets.bottom, 16) + 8,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primarySolid,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('addExpense')}
      >
        <Ionicons name="add" size={32} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}
