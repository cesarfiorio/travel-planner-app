import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../components/ui';
import { BalanceSummary } from '../../components/BalanceSummary';
import { ExpenseItem } from '../../components/ExpenseItem';
import { LockedBanner } from '../../components/LockedBanner';
import { PlanGate } from '../../components/PlanGate';
import { SettleDebtModal } from '../../components/SettleDebtModal';
import { TripSwitcher } from '../../components/TripSwitcher';
import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import { useAuth } from '../../lib/hooks/useAuth';
import { useTripExpenses, useSettleDebt, useDeleteExpense } from '../../lib/hooks/useExpenses';
import type { ExpenseWithSplits } from '../../lib/hooks/useExpenses';
import { useTrip } from '../../lib/hooks/useTrips';
import type { MemberProfileBrief } from '../../lib/hooks/useTrips';
import { useAppStore } from '../../lib/store/appStore';
import { expenseHistoryBucket } from '../../lib/utils/expenseSettlement';
import { generateExpenseReport } from '../../lib/utils/generateExpenseReport';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import type { SimplifiedDebt } from '../../lib/utils/splitCalculator';

import * as Localization from 'expo-localization';

type HistoryTab = 'active' | 'settled' | 'all';
type SortMode = 'newest' | 'oldest' | 'highest';
type CategoryFilter = 'all' | 'food' | 'transport' | 'stay' | 'activity' | 'other' | 'uncategorized';

const CATEGORY_FILTERS: CategoryFilter[] = [
  'all',
  'food',
  'transport',
  'stay',
  'activity',
  'other',
  'uncategorized',
];

function chipActive(a: CategoryFilter, b: CategoryFilter): boolean {
  return a === b;
}

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
  const deleteMutation = useDeleteExpense();

  const [historyTab, setHistoryTab] = useState<HistoryTab>('active');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [settleTarget, setSettleTarget] = useState<SimplifiedDebt | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

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

  const currency = useMemo(() => expenses[0]?.currency ?? 'USD', [expenses]);

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (historyTab === 'active') {
      list = list.filter((e) => expenseHistoryBucket(e) === 'active');
    } else if (historyTab === 'settled') {
      list = list.filter((e) => expenseHistoryBucket(e) === 'settled');
    }
    if (categoryFilter !== 'all') {
      list = list.filter((e) => {
        if (categoryFilter === 'uncategorized') {
          return !e.category || e.category.trim() === '';
        }
        return e.category === categoryFilter;
      });
    }
    list.sort((a, b) => {
      if (sortMode === 'highest') {
        return b.amount_cents - a.amount_cents;
      }
      const da = `${a.expense_date}T${a.created_at ?? ''}`;
      const db = `${b.expense_date}T${b.created_at ?? ''}`;
      const cmp = da < db ? -1 : da > db ? 1 : 0;
      return sortMode === 'oldest' ? cmp : -cmp;
    });
    return list;
  }, [expenses, historyTab, categoryFilter, sortMode]);

  const handleEdit = (expense: ExpenseWithSplits) => {
    if (!tripId) {
      return;
    }
    router.push(`/trip/${tripId}/add-expense?expenseId=${expense.id}`);
  };

  const handleDelete = (expense: ExpenseWithSplits) => {
    if (!tripId) {
      return;
    }
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody', { title: expense.title }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(
            { expenseId: expense.id, tripId },
            {
              onError: (e) => Alert.alert(t('errorLoad'), formatErrorMessage(e, t('errorSave'))),
            },
          );
        },
      },
    ]);
  };

  const settlingDebtKey =
    settleMutation.isPending && settleMutation.variables
      ? `${settleMutation.variables.debtorUserId}|${settleMutation.variables.creditorUserId}`
      : null;

  async function handleExportPdf() {
    if (!trip || exportingPdf) {
      return;
    }
    setExportingPdf(true);
    try {
      const html = generateExpenseReport({
        trip,
        expenses,
        profileById,
        memberIds,
        memberFallbackLabel: t('memberFallback'),
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert(t('exportReport'), t('pdfShareUnavailable'));
      }
    } catch (e) {
      Alert.alert(t('errorLoad'), formatErrorMessage(e, t('errorSave')));
    } finally {
      setExportingPdf(false);
    }
  }

  function categoryLabel(c: CategoryFilter): string {
    switch (c) {
      case 'all':
        return t('filterAll');
      case 'uncategorized':
        return t('filterUncategorized');
      case 'food':
        return t('categoryFood');
      case 'transport':
        return t('categoryTransport');
      case 'stay':
        return t('categoryStay');
      case 'activity':
        return t('categoryActivity');
      case 'other':
        return t('categoryOther');
      default:
        return c;
    }
  }

  function sortLabel(m: SortMode): string {
    if (m === 'newest') {
      return t('sortNewest');
    }
    if (m === 'oldest') {
      return t('sortOldest');
    }
    return t('sortHighest');
  }

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4, gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: colors.text }} numberOfLines={1}>
          {t('screenTitle')}
        </Text>
        <PlanGate requires="explorer" fallback={null}>
          <Button
            label={t('exportReport')}
            onPress={() => void handleExportPdf()}
            variant="outline"
            size="sm"
            loading={exportingPdf}
            disabled={exportingPdf || expenses.length === 0}
            accessibilityLabel={t('exportReport')}
          />
        </PlanGate>
        <TripSwitcher variant="icon" />
      </View>

      <PlanGate
        requires="explorer"
        feature="pdfExport"
        fallback={<LockedBanner message={t('pdfLockedMessage')} featureId="pdfExport" />}
      >
        {null}
      </PlanGate>

      {isPending && expenses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primarySolid} size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.inactive, textAlign: 'center', marginBottom: 16 }}>{t('errorLoad')}</Text>
          <Button label={t('retry')} onPress={() => void refetch()} variant="primary" />
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          ListHeaderComponent={
            <>
              {trip && uid ? (
                <BalanceSummary
                  expenses={expenses}
                  profileById={profileById}
                  currentUserId={uid}
                  memberIds={memberIds}
                  hasExpenses={expenses.length > 0}
                  onSettleDebt={(d) => setSettleTarget(d)}
                  settlingDebtKey={settlingDebtKey}
                />
              ) : null}

              <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inactive, marginBottom: 8 }}>
                  {t('historyTabsLabel')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['active', 'settled', 'all'] as HistoryTab[]).map((tab) => (
                    <Pressable
                      key={tab}
                      onPress={() => setHistoryTab(tab)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 20,
                        backgroundColor: historyTab === tab ? colors.primarySolid : '#F3F4F6',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: historyTab === tab ? colors.onPrimary : colors.text,
                        }}
                      >
                        {tab === 'active' ? t('tabActive') : tab === 'settled' ? t('tabSettled') : t('tabAll')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inactive, marginBottom: 8, paddingHorizontal: 16 }}>
                  {t('categoryFilterLabel')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {CATEGORY_FILTERS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCategoryFilter(c)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        backgroundColor: chipActive(categoryFilter, c) ? '#E0E7FF' : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: chipActive(categoryFilter, c) ? '#6366F1' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: chipActive(categoryFilter, c) ? '#3730A3' : colors.text,
                        }}
                      >
                        {categoryLabel(c)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inactive }}>{t('sortLabel')}</Text>
                {(['newest', 'oldest', 'highest'] as SortMode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setSortMode(m)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: sortMode === m ? colors.primarySolid : '#F3F4F6',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: sortMode === m ? colors.onPrimary : colors.text,
                      }}
                    >
                      {sortLabel(m)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.inactive, paddingVertical: 38, paddingHorizontal: 28 }}>
              {expenses.length === 0 ? t('emptyList') : t('emptyFiltered')}
            </Text>
          }
          renderItem={({ item }) => (
            <ExpenseItem
              expense={item}
              paidByProfile={profileById.get(item.paid_by_user_id)}
              profileById={profileById}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
          bottom: Math.max(20, insets.bottom + 8),
          zIndex: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: '#FFF3EC',
          borderWidth: 1,
          borderColor: colors.primarySolid,
          opacity: pressed ? 0.88 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('addExpense')}
      >
        <Ionicons name="add-circle" size={34} color={colors.primarySolid} />
      </Pressable>

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
