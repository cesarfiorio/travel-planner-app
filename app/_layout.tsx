import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { hasSupabaseEnv, supabase } from '../lib/supabase';

export default function RootLayout() {
  useEffect(() => {
    const loadSession = async () => {
      if (!hasSupabaseEnv || !supabase) {
        console.warn(
          'Supabase env missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local',
        );
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Supabase session error:', error.message);
        return;
      }

      console.log('Supabase session:', data.session);
    };

    void loadSession();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
