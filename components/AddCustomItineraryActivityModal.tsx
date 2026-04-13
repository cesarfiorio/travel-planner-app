import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, notes: string) => void | Promise<void>;
  saving?: boolean;
};

export function AddCustomItineraryActivityModal({ visible, onClose, onAdd, saving }: Props) {
  const { t } = useTranslation(['trips', 'common']);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setTitle('');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert(t('trips:errorTitle'), t('trips:itineraryCustomTitleRequired'));
      return;
    }
    void Promise.resolve(onAdd(trimmed, notes.trim())).then(() => {
      reset();
      onClose();
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable
        onPress={handleClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: SPACING.lg }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: COLORS.cardBg,
            borderRadius: RADIUS.xl,
            padding: SPACING.lg,
            maxHeight: '85%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
            <Text style={{ fontSize: FONT.xl, fontWeight: FONT.extrabold, color: COLORS.textPrimary, flex: 1 }}>
              {t('trips:itineraryAddCustomTitle')}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('trips:closeA11y')}>
              <Ionicons name="close" size={26} color={COLORS.textTertiary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs }}>
              {t('trips:itineraryAddCustomFieldTitle')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('trips:itineraryAddCustomTitlePlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                fontSize: FONT.md,
                color: COLORS.textPrimary,
                marginBottom: SPACING.lg,
              }}
            />

            <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs }}>
              {t('trips:itineraryAddCustomFieldNotes')}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('trips:itineraryNotesPlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
              multiline
              style={{
                minHeight: 88,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                fontSize: FONT.md,
                color: COLORS.textPrimary,
              }}
            />
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
            <Pressable
              onPress={handleClose}
              style={{
                flex: 1,
                paddingVertical: SPACING.md,
                borderRadius: RADIUS.pill,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textPrimary }}>{t('trips:itineraryActivityClose')}</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: SPACING.md,
                borderRadius: RADIUS.pill,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                opacity: saving ? 0.7 : 1,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textOnPrimary }}>{t('trips:itineraryAddCustomSave')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
