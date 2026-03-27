import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { useAuthStore } from '../store/authStore';
import { hasSupabaseEnv, supabase } from '../supabase';

let bootstrapPromise: Promise<void> | null = null;

async function bootstrapAuth(): Promise<void> {
  await useAuthStore.persist.rehydrate();

  if (!hasSupabaseEnv || !supabase) {
    return;
  }

  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(currentSession);

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    useAuthStore.getState().setSession(nextSession);
  });
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
