import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '../../components/ui';
import { colors } from '../../constants/colors';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  getOAuthRedirectUri,
  signInWithApple,
  signInWithGoogle,
} from '../../lib/supabase/auth';
import { logger } from '../../lib/utils/logger';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [busyProvider, setBusyProvider] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    if (__DEV__) {
      logger.debug('[RouteFlow] OAuth redirect URI (add to Supabase):', getOAuthRedirectUri());
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (session) {
      router.replace('/');
    }
  }, [isReady, session, router]);

  const runGoogle = async () => {
    setBusyProvider('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common:googleSignInFailed');
      const devRedirectHint = __DEV__
        ? t('common:devRedirectHint', { uri: getOAuthRedirectUri() })
        : '';
      Alert.alert(t('common:signInFailed'), `${message}${devRedirectHint}`);
    } finally {
      setBusyProvider(null);
    }
  };

  const runApple = async () => {
    setBusyProvider('apple');
    try {
      await signInWithApple();
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      const message = e instanceof Error ? e.message : t('common:appleSignInFailed');
      Alert.alert(t('common:signInFailed'), message);
    } finally {
      setBusyProvider(null);
    }
  };

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>{t('common:loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 72,
        paddingBottom: 32,
        backgroundColor: colors.background,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 88, height: 88, borderRadius: 20, marginBottom: 16 }}
          accessibilityLabel={t('auth:appIconA11y')}
        />
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: colors.text,
            letterSpacing: -0.5,
          }}
        >
          {t('auth:brandName')}
        </Text>
        <Text
          style={{
            marginTop: 12,
            fontSize: 17,
            color: colors.inactive,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          {t('auth:tagline')}
        </Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Button
          label={t('auth:continueWithGoogle')}
          onPress={runGoogle}
          variant="primary"
          size="lg"
          fullWidth
          loading={busyProvider === 'google'}
          disabled={busyProvider !== null}
          leftIcon={<Ionicons name="logo-google" size={22} color="#4285F4" />}
          accessibilityLabel={t('auth:continueWithGoogleA11y')}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Button
          label={t('auth:continueWithApple')}
          onPress={runApple}
          variant="primary"
          size="lg"
          fullWidth
          loading={busyProvider === 'apple'}
          disabled={busyProvider !== null}
          leftIcon={<Ionicons name="logo-apple" size={24} color="#ffffff" />}
          accessibilityLabel={t('auth:continueWithAppleA11y')}
        />
      </View>

      <Text
        style={{
          fontSize: 12,
          color: colors.inactive,
          textAlign: 'center',
          lineHeight: 18,
        }}
      >
        {t('common:termsPrivacy')}
      </Text>
    </ScrollView>
  );
}
