import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { ExpenseWithSplits } from '../lib/hooks/useExpenses';
import type { MemberProfileBrief } from '../lib/hooks/useTrips';
import { groupExpensesByCurrency } from '../lib/utils/expenseBalanceGroups';
import { formatCurrency } from '../lib/utils/formatCurrency';

import * as Localization from 'expo-localization';

const CARD_RADIUS = 16;
const GREEN_OWED = '#27AE60';
const RED_OWES = '#FF5A5F';
const AVATAR_BG = ['#FCE7F3', '#D1FAE5', '#DBEAFE', '#FEF3C7', '#E9D5FF'] as const;

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
}

function avatarBg(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) {
    h = (h + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_BG[h % AVATAR_BG.length];
}

function initial(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}

type Props = {
  expenses: ExpenseWithSplits[];
  profileById: Map<string, MemberProfileBrief>;
  memberIds: string[];
  currentUserId: string;
};

export function ExpensesBalancesCard({ expenses, profileById, memberIds, currentUserId }: Props) {
  const { t } = useTranslation('expenses');
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';

  const groups = useMemo(() => groupExpensesByCurrency(expenses), [expenses]);
  const primary = groups[0];
  const currency = primary?.currency ?? 'USD';
  const balances = primary?.balances ?? {};

  const sortedIds = useMemo(() => {
    return [...memberIds].sort((a, b) =>
      displayName(profileById.get(a), a).localeCompare(displayName(profileById.get(b), b), undefined, {
        sensitivity: 'base',
      }),
    );
  }, [memberIds, profileById]);

  if (expenses.length === 0) {
    return (
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 20,
          padding: 18,
          borderRadius: CARD_RADIUS,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 }}>{t('balanceTitle')}</Text>
        <Text style={{ fontSize: 15, color: '#6B7280', lineHeight: 22 }}>{t('balanceNoExpensesYet')}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 18,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 }}>{t('balanceTitle')}</Text>
      {groups.length > 1 ? (
        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{t('mixedCurrenciesBalanceHint')}</Text>
      ) : null}

      {sortedIds.map((id, index) => {
        const b = balances[id] ?? 0;
        const name = id === currentUserId ? t('you') : displayName(profileById.get(id), t('memberFallback'));
        const absLabel = formatCurrency(Math.abs(b), currency, locale);
        let statusText: string;
        let statusColor: string;
        if (b < 0) {
          statusText = t('balanceOwes', { amount: absLabel });
          statusColor = RED_OWES;
        } else if (b > 0) {
          statusText = t('balanceOwed', { amount: absLabel });
          statusColor = GREEN_OWED;
        } else {
          statusText = t('balanceEven');
          statusColor = '#6B7280';
        }

        return (
          <View
            key={id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: '#F3F4F6',
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: avatarBg(id),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151' }}>{initial(name)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: statusColor }}>{statusText}</Text>
          </View>
        );
      })}
    </View>
  );
}
