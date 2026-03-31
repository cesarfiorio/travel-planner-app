import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { MemberProfileBrief } from '../lib/hooks/useTrips';
import { formatCurrency } from '../lib/utils/formatCurrency';
import type { SimplifiedDebt } from '../lib/utils/splitCalculator';

import * as Localization from 'expo-localization';

import { DebtRow } from './DebtRow';

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
}

type BalanceSummaryProps = {
  balances: Record<string, number>;
  simplified: SimplifiedDebt[];
  profileById: Map<string, MemberProfileBrief>;
  currency: string;
  currentUserId: string;
  memberIds: string[];
  /** When false, net is 0 because there is nothing to split yet — not “all settled”. */
  hasExpenses: boolean;
};

export function BalanceSummary({
  balances,
  simplified,
  profileById,
  currency,
  currentUserId,
  memberIds,
  hasExpenses,
}: BalanceSummaryProps) {
  const { t } = useTranslation('expenses');
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const positive = '#059669';
  const negative = '#DC2626';

  const myNet = balances[currentUserId] ?? 0;
  let netLine: string;
  if (!hasExpenses) {
    netLine = t('balanceNoExpensesYet');
  } else if (myNet > 0) {
    netLine = t('netPositive', { amount: formatCurrency(myNet, currency, locale) });
  } else if (myNet < 0) {
    netLine = t('netNegative', { amount: formatCurrency(-myNet, currency, locale) });
  } else {
    netLine = t('netZero');
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{t('balanceTitle')}</Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color:
            !hasExpenses ? colors.inactive : myNet > 0 ? positive : myNet < 0 ? negative : colors.inactive,
          marginBottom: 16,
        }}
      >
        {netLine}
      </Text>

      {memberIds.map((id) => {
        const b = balances[id] ?? 0;
        if (b === 0) {
          return null;
        }
        const name =
          id === currentUserId ? t('you') : displayName(profileById.get(id), t('memberFallback'));
        const label = `${name}: ${formatCurrency(b, currency, locale)}`;
        return (
          <Text
            key={id}
            style={{
              fontSize: 14,
              color: b > 0 ? positive : negative,
              marginBottom: 4,
            }}
          >
            Csa
          </Text>
        );
      })}

      {simplified.length > 0 ? (
        <>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 8 }}>
            {t('debtsTitle')}
          </Text>
          {simplified.map((d, i) => (
            <DebtRow
              key={`${d.from}-${d.to}-${i}`}
              debt={d}
              fromName={
                d.from === currentUserId ? t('you') : displayName(profileById.get(d.from), t('memberFallback'))
              }
              toName={d.to === currentUserId ? t('you') : displayName(profileById.get(d.to), t('memberFallback'))}
              currency={currency}
              currentUserId={currentUserId}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}
