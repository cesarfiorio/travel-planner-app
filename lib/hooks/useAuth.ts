import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { useAuthStore } from '../store/authStore';
import { hasSupabaseEnv, supabase } from '../supabase';
import { logger } from '../utils/logger';

let bootstrapPromise: Promise<void> | null = null;

function devAutoAnonymousEnabled(): boolean {
  return (
    __DEV__ &&
    process.env.EXPO_PUBLIC_DEV_AUTO_ANONYMOUS_AUTH === '1'
  );
}

async function bootstrapAuth(): Promise<void> {
  await useAuthStore.persist.rehydrate();

  if (!hasSupabaseEnv || !supabase) {
    return;
  }

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    useAuthStore.getState().setSession(nextSession);
  });

  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(currentSession);

  if (devAutoAnonymousEnabled() && !currentSession) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      logger.warn('[RouteFlow] DEV_AUTO_ANONYMOUS_AUTH failed (enable Anonymous in Supabase Auth → Providers)', {
        message: error.message,
      });
    } else if (data.session) {
      logger.debug('[RouteFlow] Signed in anonymously for local dev (no OAuth).');
      useAuthStore.getState().setSession(data.session);
    }
  }
}

function ensureAuthBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapAuth();
  }
  return bootstrapPromise;
}

export type UseAuthResult = {
  isReady: boolean;
  session: ReturnType<typeof useAuthStore.getState>['session'];
  user: User | null;
};

export function useAuth(): UseAuthResult {
  const session = useAuthStore((s) => s.session);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void ensureAuthBootstrap().finally(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isReady,
    session,
    user: session?.user ?? null,
  };
}
