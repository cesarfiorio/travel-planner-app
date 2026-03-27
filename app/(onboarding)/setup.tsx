import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useUpdateProfileName } from '../../lib/hooks/useProfile';

export default function OnboardingSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const updateProfile = useUpdateProfileName();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter how you would like to be called.');
      return;
    }

    updateProfile.mutate(trimmed, {
      onSuccess: () => {
        router.replace('/(tabs)');
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : 'Could not save your name';
        Alert.alert('Something went wrong', message);
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
          What should we call you?
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
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
          accessibilityLabel="Display name"
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
          accessibilityLabel="Continue to the app"
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>{`Let's go →`}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
