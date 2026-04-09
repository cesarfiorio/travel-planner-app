import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import type { ExpenseWithSplits } from '../lib/hooks/useExpenses';
import type { MemberProfileBrief } from '../lib/hooks/useTrips';
import { groupExpensesByCurrency } from '../lib/utils/expenseBalanceGroups';
import { formatCurrency } from '../lib/utils/formatCurrency';

const CARD_RADIUS = RADIUS.xl;
const RED_OWES = COLORS.danger;
const GREEN_OWED = '#27AE60';

const PERSON_RING_STYLES: { bg: string; icon: string }[] = [
  { bg: COLORS.primaryLight, icon: COLORS.primary },
  { bg: COLORS.successLight, icon: '#059669' },
  { bg: '#DBEAFE', icon: '#2563EB' },
];

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
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

  const cardShell = {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: CARD_RADIUS,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  } as const;

  if (expenses.length === 0) {
    return (
      <View style={cardShell}>
        <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary, marginBottom: 10 }}>
          {t('balanceTitle')}
        </Text>
        <Text style={{ fontSize: FONT.md, color: COLORS.textSecondary, lineHeight: 22 }}>{t('balanceNoExpensesYet')}</Text>
      </View>
    );
  }

  return (
    <View style={cardShell}>
      <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary, marginBottom: 14 }}>
        {t('balanceTitle')}
      </Text>
      {groups.length > 1 ? (
        <Text style={{ fontSize: FONT.xs, color: COLORS.textSecondary, marginBottom: 12 }}>{t('mixedCurrenciesBalanceHint')}</Text>
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
          statusColor = COLORS.textSecondary;
        }

        const ring = PERSON_RING_STYLES[index % PERSON_RING_STYLES.length];

        return (
          <View
            key={id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: COLORS.pageBg,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: ring.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={22} color={ring.icon} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: FONT.md, fontWeight: FONT.semibold, color: COLORS.textPrimary }} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: statusColor }}>{statusText}</Text>
          </View>
        );
      })}
    </View>
  );
}
