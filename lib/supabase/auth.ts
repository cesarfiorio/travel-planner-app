import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { useAuthStore } from '../store/authStore';
import { hasSupabaseEnv, supabase } from '../supabase';

/** Deep link path registered with Expo; add matching URLs in Supabase Auth → URL Configuration. */
export const AUTH_CALLBACK_PATH = 'auth/callback';

export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'routeflow',
    path: AUTH_CALLBACK_PATH,
  });
}

function getQueryParam(url: string, key: string): string | null {
  const parsed = Linking.parse(url);
  const raw = parsed.queryParams?.[key];
  if (typeof raw === 'string') {
    return raw;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw[0] ?? null;
  }
  return null;
}

async function finalizeOAuthReturnUrl(url: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const code = getQueryParam(url, 'code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return;
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const fragment = url.slice(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        throw error;
      }
      return;
    }
  }

  throw new Error('Could not complete sign-in (missing authorization code or tokens).');
}

export async function signInWithGoogle(): Promise<void> {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const redirectTo = getOAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('No OAuth URL returned from Supabase');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return;
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in did not return a result URL');
  }

  await finalizeOAuthReturnUrl(result.url);
}

function randomNonce(length = 32): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function signInWithApple(): Promise<void> {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sign in with Apple is not available on this device');
  }

  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    if (supabase) {
      await supabase.auth.signOut({ scope: 'global' });
    }
  } finally {
    useAuthStore.getState().clearAuth();
    await useAuthStore.persist.clearStorage();
    router.replace('/(auth)/login');
  }
}
