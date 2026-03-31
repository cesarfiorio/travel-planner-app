import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { formatCurrency } from '../lib/utils/formatCurrency';
import type { SimplifiedDebt } from '../lib/utils/splitCalculator';

import * as Localization from 'expo-localization';

type DebtRowProps = {
  debt: SimplifiedDebt;
  fromName: string;
  toName: string;
  currency: string;
  currentUserId: string;
  onSettlePress?: (debt: SimplifiedDebt) => void;
  isSettling?: boolean;
};

export function DebtRow({
  debt,
  fromName,
  toName,
  currency,
  currentUserId,
  onSettlePress,
  isSettling,
}: DebtRowProps) {
  const { t } = useTranslation('expenses');
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US';
  const amount = formatCurrency(debt.cents, currency, locale);

  let line: string;
  if (debt.from === currentUserId) {
    line = t('youOwe', { name: toName, amount });
  } else if (debt.to === currentUserId) {
    line = t('owesYou', { name: fromName, amount });
  } else {
    line = t('owesThirdParty', { from: fromName, to: toName, amount });
  }

  const canSettle = debt.from === currentUserId && Boolean(onSettlePress);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginRight: 12 }}>{line}</Text>
      {canSettle ? (
        <Pressable
          onPress={() => onSettlePress?.(debt)}
          disabled={isSettling}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: '#FFF3EC',
            opacity: pressed ? 0.85 : isSettling ? 0.5 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('settleUp')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primarySolid }}>{t('settleUp')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
