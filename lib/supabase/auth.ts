import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { i18n } from '../i18n';
import { queryClient } from '../query/queryClient';
import { useAuthStore } from '../store/authStore';
import { hasSupabaseEnv, supabase } from '../supabase';

/** Deep link path registered with Expo; add matching URLs in Supabase Auth → URL Configuration. */
export const AUTH_CALLBACK_PATH = 'auth/callback';

/** Use app scheme from `app.json`; allow `routeflow://auth/callback` in Supabase Auth → Redirect URLs. */
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
    throw new Error(i18n.t('common:errorSupabaseNotConfigured'));
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

  throw new Error(i18n.t('common:errorOAuthIncomplete'));
}

export async function signInWithGoogle(): Promise<void> {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error(i18n.t('common:errorSupabaseNotConfigured'));
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
    throw new Error(i18n.t('common:errorNoOAuthUrl'));
  }

  if (__DEV__) {
    console.log('[RouteFlow] OAuth redirectTo (must match Supabase Redirect URLs exactly):', redirectTo);
    try {
      const parsed = new URL(data.url);
      console.log('[RouteFlow] OAuth opening:', parsed.origin + parsed.pathname);
    } catch {
      console.log('[RouteFlow] OAuth URL prefix:', data.url.slice(0, 96));
    }
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (__DEV__) {
    console.log('[RouteFlow] OAuth browser closed:', result.type);
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return;
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error(i18n.t('common:errorGoogleNoResultUrl'));
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
    throw new Error(i18n.t('common:errorSupabaseNotConfigured'));
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error(i18n.t('common:errorAppleUnavailable'));
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
    throw new Error(i18n.t('common:errorAppleNoToken'));
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
    queryClient.clear();
    useAuthStore.getState().clearAuth();
    await useAuthStore.persist.clearStorage();
    router.replace('/(auth)/login');
  }
}

/**
 * Deletes the currently authenticated user via GoTrue (requires allow list / provider settings).
 * Clears TanStack Query cache and local session afterward.
 */
export async function deleteOwnAccount(): Promise<void> {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error(i18n.t('common:errorSupabaseNotConfigured'));
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(i18n.t('common:errorMissingEnv'));
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error(i18n.t('common:errorNoSession'));
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || i18n.t('common:errorDeleteAccountHttp', { status: res.status }));
  }

  await signOut();
}
