import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import type { ShareFormat } from '../../lib/utils/shareCard';

type ShareFormatSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (format: ShareFormat) => void;
  showLink?: boolean;
};

type RowProps = { icon: string; label: string; sub: string; onPress: () => void };

function Row({ icon, label, sub, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 4,
        opacity: pressed ? 0.8 : 1,
      })}
      accessibilityRole="button"
    >
      <Text style={{ fontSize: 26 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 13, color: colors.inactive }}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
    </Pressable>
  );
}

export function ShareFormatSheet({ visible, onClose, onPick, showLink = true }: ShareFormatSheetProps) {
  const { t } = useTranslation('share');
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 }}>{t('title')}</Text>

        <Row icon="📱" label={t('storyLabel')} sub={t('storySub')} onPress={() => { onPick('story'); onClose(); }} />
        <Row icon="🟦" label={t('squareLabel')} sub={t('squareSub')} onPress={() => { onPick('square'); onClose(); }} />
        {showLink ? (
          <Row icon="🔗" label={t('linkLabel')} sub={t('linkSub')} onPress={() => { onPick('link'); onClose(); }} />
        ) : null}

        <Pressable onPress={onClose} style={{ marginTop: 8, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inactive }}>{t('cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
