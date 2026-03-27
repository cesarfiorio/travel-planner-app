import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type AuthStoreState = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearAuth: () => void;
};

const AUTH_PERSIST_KEY = 'routeflow-auth-store';

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearAuth: () => set({ session: null }),
    }),
    {
      name: AUTH_PERSIST_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
