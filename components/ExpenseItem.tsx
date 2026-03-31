import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

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
};

export function ExpenseItem({ expense, paidByProfile, profileById }: ExpenseItemProps) {
  const { t } = useTranslation('expenses');
  const locale = localeTag();
  const currency = expense.currency || 'EUR';
  const amountLabel = formatCurrency(expense.amount_cents, currency, locale);
  const payer = displayName(paidByProfile, t('memberFallback'));

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
  const splitPreview =
    splits.length > 0
      ? splits
          .map((s) => {
            const name = displayName(profileById.get(s.user_id), t('memberFallback'));
            return `${name}: ${formatCurrency(s.amount_owed_cents, currency, locale)}`;
          })
          .join(' · ')
      : null;

  return (
    <View
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
      {splitPreview ? (
        <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 6 }} numberOfLines={3}>
          {splitPreview}
        </Text>
      ) : null}
    </View>
  );
}

