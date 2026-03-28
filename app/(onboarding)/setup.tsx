import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import { useUpdateProfileName } from '../../lib/hooks/useProfile';

export default function OnboardingSetupScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const router = useRouter();
  const [name, setName] = useState('');
  const updateProfile = useUpdateProfileName();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('profile:nameRequiredTitle'), t('profile:nameRequiredMessage'));
      return;
    }

    updateProfile.mutate(trimmed, {
      onSuccess: () => {
        router.replace('/(tabs)');
      },
      onError: (err) => {
        const message = formatErrorMessage(err, t('common:couldNotSaveName'));
        Alert.alert(t('common:somethingWentWrong'), message);
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 72, justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 24,
          }}
        >
          {t('profile:onboardingHeadline')}
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('profile:yourNamePlaceholder')}
          placeholderTextColor={colors.inactive}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            color: colors.text,
            marginBottom: 24,
          }}
          accessibilityLabel={t('profile:displayNameA11y')}
        />

        <Pressable
          onPress={submit}
          disabled={updateProfile.isPending}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor: colors.primary,
            opacity: updateProfile.isPending ? 0.7 : pressed ? 0.9 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('profile:continueToAppA11y')}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>{t('profile:letsGo')}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
