import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { SimplifiedDebt } from '../lib/utils/splitCalculator';

type SettleDebtModalProps = {
  visible: boolean;
  debt: SimplifiedDebt | null;
  creditorName: string;
  amountLabel: string;
  confirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SettleDebtModal({
  visible,
  debt,
  creditorName,
  amountLabel,
  confirming,
  onClose,
  onConfirm,
}: SettleDebtModalProps) {
  const { t } = useTranslation('expenses');
  if (!visible || !debt) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 }}>
            {t('settleConfirmTitle')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 20 }}>
            {t('settleConfirmBody', { amount: amountLabel, name: creditorName })}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable
              onPress={onClose}
              disabled={confirming}
              style={{ paddingVertical: 12, paddingHorizontal: 16 }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inactive }}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={confirming}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 12,
                backgroundColor: colors.primarySolid,
                minWidth: 100,
                alignItems: 'center',
              }}
              accessibilityRole="button"
            >
              {confirming ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.onPrimary }}>{t('confirmSettle')}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
