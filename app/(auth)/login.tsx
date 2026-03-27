import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../../lib/hooks/useAuth';
import {
  getOAuthRedirectUri,
  signInWithApple,
  signInWithGoogle,
} from '../../lib/supabase/auth';

import { colors } from '../../constants/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [busyProvider, setBusyProvider] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    if (__DEV__) {
      console.log('[RouteFlow] OAuth redirect URI (add to Supabase):', getOAuthRedirectUri());
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
      const message = e instanceof Error ? e.message : 'Google sign-in failed';
      Alert.alert('Sign in failed', message);
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
      const message = e instanceof Error ? e.message : 'Apple sign-in failed';
      Alert.alert('Sign in failed', message);
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
        <Text style={{ marginTop: 16, color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  const disabled = busyProvider !== null;

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
          accessibilityLabel="RouteFlow app icon"
        />
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: colors.text,
            letterSpacing: -0.5,
          }}
        >
          RouteFlow
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
          Travel together. Split everything.
        </Text>
      </View>

      <Pressable
        onPress={runGoogle}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#dadce0',
          backgroundColor: '#ffffff',
          opacity: disabled ? 0.65 : pressed ? 0.9 : 1,
          marginBottom: 12,
        })}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {busyProvider === 'google' ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <>
            <Ionicons name="logo-google" size={22} color="#4285F4" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#3c4043' }}>
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={runApple}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: '#000000',
          opacity: disabled ? 0.65 : pressed ? 0.88 : 1,
          marginBottom: 24,
        })}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
      >
        {busyProvider === 'apple' ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={24} color="#ffffff" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
              Continue with Apple
            </Text>
          </>
        )}
      </Pressable>

      <Text
        style={{
          fontSize: 12,
          color: colors.inactive,
          textAlign: 'center',
          lineHeight: 18,
        }}
      >
        By continuing, you agree to our Terms & Privacy Policy
      </Text>
    </ScrollView>
  );
}
