import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { formatCurrency } from '../lib/utils/formatCurrency';
import type { ExpenseWithSplits } from '../lib/hooks/useExpenses';
import type { MemberProfileBrief } from '../lib/hooks/useTrips';

import * as Localization from 'expo-localization';

const localeTag = () => Localization.getLocales()[0]?.languageTag ?? 'en-US';

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
}

type ExpenseItemProps = {
  expense: ExpenseWithSplits;
  paidByProfile?: MemberProfileBrief;
  profileById: Map<string, MemberProfileBrief>;
  onEdit?: (expense: ExpenseWithSplits) => void;
  onDelete?: (expense: ExpenseWithSplits) => void;
};

export function ExpenseItem({ expense, paidByProfile, profileById, onEdit, onDelete }: ExpenseItemProps) {
  const { t } = useTranslation('expenses');
  const locale = localeTag();
  const currency = expense.currency || 'EUR';
  const amountLabel = formatCurrency(expense.amount_cents, currency, locale);
  const payer = displayName(paidByProfile, t('memberFallback'));
  const [expanded, setExpanded] = useState(false);

  const categoryKey =
    expense.category === 'food'
      ? 'categoryFood'
      : expense.category === 'transport'
        ? 'categoryTransport'
        : expense.category === 'stay'
          ? 'categoryStay'
          : expense.category === 'activity'
            ? 'categoryActivity'
            : expense.category === 'other'
              ? 'categoryOther'
              : null;

  const splits = expense.expense_splits ?? [];

  function settledDateLabel(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  }

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 }} numberOfLines={2}>
          {expense.title}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{amountLabel}</Text>
      </View>
      <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 4 }}>
        {expense.expense_date} · {t('paidBy', { name: payer })}
      </Text>
      {categoryKey ? (
        <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 2 }}>{t(categoryKey)}</Text>
      ) : null}

      {expanded ? (
        <>
          {splits.length > 0 ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              {splits.map((s) => {
                const name = displayName(profileById.get(s.user_id), t('memberFallback'));
                const amt = formatCurrency(s.amount_owed_cents, currency, locale);
                const settled = Boolean(s.is_settled) && s.amount_owed_cents > 0;
                const when = settledDateLabel(s.settled_at);
                return (
                  <View key={s.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: settled ? colors.inactive : colors.text,
                        textDecorationLine: settled ? 'line-through' : undefined,
                      }}
                    >
                      {name}: {amt}
                    </Text>
                    {settled ? (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E5E7EB' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.inactive }}>
                          {t('settledBadge', { date: when })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {(onEdit || onDelete) ? (
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
              {onEdit ? (
                <Pressable
                  onPress={() => onEdit(expense)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: '#E0E7FF',
                    opacity: pressed ? 0.85 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={t('editExpense')}
                >
                  <Ionicons name="pencil" size={16} color="#3730A3" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#3730A3' }}>{t('editExpense')}</Text>
                </Pressable>
              ) : null}
              {onDelete ? (
                <Pressable
                  onPress={() => onDelete(expense)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: '#FEE2E2',
                    opacity: pressed ? 0.85 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={t('deleteExpense')}
                >
                  <Ionicons name="trash" size={16} color="#DC2626" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626' }}>{t('deleteExpense')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}
