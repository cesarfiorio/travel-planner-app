import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { ExpenseWithSplits } from '../lib/hooks/useExpenses';
import type { MemberProfileBrief } from '../lib/hooks/useTrips';
import { formatCurrency } from '../lib/utils/formatCurrency';

import * as Localization from 'expo-localization';

const CARD_RADIUS = 16;

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
}

function formatExpenseShortDate(ymd: string, locale: string): string {
  const parts = ymd.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) {
    return ymd;
  }
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

type Props = {
  expense: ExpenseWithSplits;
  paidByProfile?: MemberProfileBrief;
  profileById: Map<string, MemberProfileBrief>;
  onPress: () => void;
};

export function ExpensePreviewCard({ expense, paidByProfile, profileById, onPress }: Props) {
  const { t } = useTranslation('expenses');
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const currency = expense.currency || 'USD';
  const amountLabel = formatCurrency(expense.amount_cents, currency, locale);
  const payer = displayName(paidByProfile, t('memberFallback'));

  const splits = expense.expense_splits ?? [];
  const others = splits
    .filter((s) => s.amount_owed_cents > 0 && s.user_id !== expense.paid_by_user_id)
    .map((s) => displayName(profileById.get(s.user_id), t('memberFallback')));
  const splitLine =
    others.length > 0 ? t('paidBySplitWith', { payer, others: others.join(', ') }) : t('paidBy', { name: payer });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: 20,
        marginBottom: 14,
        padding: 16,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        opacity: pressed ? 0.96 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      })}
      accessibilityRole="button"
      accessibilityLabel={expense.title}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 12 }} numberOfLines={2}>
          {expense.title}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{amountLabel}</Text>
      </View>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>{formatExpenseShortDate(expense.expense_date, locale)}</Text>
      <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }} numberOfLines={3}>
        {splitLine}
      </Text>
    </Pressable>
  );
}
