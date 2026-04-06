import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { ExpenseWithSplits } from '../lib/hooks/useExpenses';
import type { MemberProfileBrief } from '../lib/hooks/useTrips';
import { formatCurrency } from '../lib/utils/formatCurrency';
import { groupExpensesByCurrency } from '../lib/utils/expenseBalanceGroups';
import type { SimplifiedDebt } from '../lib/utils/splitCalculator';

import * as Localization from 'expo-localization';

import { DebtRow } from './DebtRow';

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
}

type BalanceSummaryProps = {
  expenses: ExpenseWithSplits[];
  profileById: Map<string, MemberProfileBrief>;
  currentUserId: string;
  memberIds: string[];
  hasExpenses: boolean;
  onSettleDebt?: (debt: SimplifiedDebt) => void;
  settlingDebtKey?: string | null;
};

export function BalanceSummary({
  expenses,
  profileById,
  currentUserId,
  memberIds,
  hasExpenses,
  onSettleDebt,
  settlingDebtKey,
}: BalanceSummaryProps) {
  const { t } = useTranslation('expenses');
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const positive = '#059669';
  const negative = '#DC2626';

  const groups = useMemo(() => groupExpensesByCurrency(expenses), [expenses]);
  const isMixed = groups.length > 1;

  if (!hasExpenses) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{t('balanceTitle')}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.inactive, marginBottom: 16 }}>
          {t('balanceNoExpensesYet')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{t('balanceTitle')}</Text>

      {groups.map((g) => {
        const myNet = g.balances[currentUserId] ?? 0;
        let netLine: string;
        if (myNet > 0) {
          netLine = t('netPositive', { amount: formatCurrency(myNet, g.currency, locale) });
        } else if (myNet < 0) {
          netLine = t('netNegative', { amount: formatCurrency(-myNet, g.currency, locale) });
        } else {
          netLine = t('netZero');
        }

        return (
          <View key={g.currency} style={{ marginBottom: isMixed ? 16 : 0 }}>
            {isMixed ? (
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primarySolid, marginBottom: 4 }}>
                {g.currency}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: myNet > 0 ? positive : myNet < 0 ? negative : colors.inactive,
                marginBottom: 12,
              }}
            >
              {netLine}
            </Text>

            {memberIds.map((id) => {
              const b = g.balances[id] ?? 0;
              if (b === 0) {
                return null;
              }
              const name = id === currentUserId ? t('you') : displayName(profileById.get(id), t('memberFallback'));
              return (
                <Text key={id} style={{ fontSize: 14, color: b > 0 ? positive : negative, marginBottom: 4 }}>
                  {name}: {formatCurrency(b, g.currency, locale)}
                </Text>
              );
            })}

            {g.simplified.length > 0 ? (
              <>
                {!isMixed ? (
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 8 }}>
                    {t('debtsTitle')}
                  </Text>
                ) : null}
                {g.simplified.map((d, i) => (
                  <DebtRow
                    key={`${g.currency}-${d.from}-${d.to}-${i}`}
                    debt={d}
                    fromName={d.from === currentUserId ? t('you') : displayName(profileById.get(d.from), t('memberFallback'))}
                    toName={d.to === currentUserId ? t('you') : displayName(profileById.get(d.to), t('memberFallback'))}
                    currency={g.currency}
                    currentUserId={currentUserId}
                    onSettlePress={onSettleDebt}
                    isSettling={settlingDebtKey === `${d.from}|${d.to}`}
                  />
                ))}
              </>
            ) : null}
          </View>
        );
      })}

      {isMixed && groups.some((g) => g.simplified.length > 0) ? (
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: 8 }}>
          {t('debtsTitle')}
        </Text>
      ) : null}
    </View>
  );
}
