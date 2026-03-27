import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { useAuth } from '../lib/hooks/useAuth';
import { useProfile } from '../lib/hooks/useProfile';

function AuthenticatedGate() {
  const { session } = useAuth();
  const { data: profile, isLoading, isError, error } = useProfile();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, textAlign: 'center' }}>
          {error instanceof Error ? error.message : 'Unable to load your profile.'}
        </Text>
      </View>
    );
  }

  const needsOnboarding = !profile?.full_name?.trim();
  if (needsOnboarding) {
    return <Redirect href="/(onboarding)/setup" />;
  }

  return <Redirect href="/(tabs)" />;
}

export default function Index() {
  const { isReady, session } = useAuth();

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <AuthenticatedGate />;
}
