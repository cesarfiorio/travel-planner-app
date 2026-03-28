import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Tables } from '../supabase/types';

export type ActiveTripSnapshot = Pick<
  Tables<'trips'>,
  'id' | 'name' | 'destination_label' | 'start_date' | 'end_date' | 'status' | 'created_by'
>;

type AppStoreState = {
  activeTrip: ActiveTripSnapshot | null;
  setActiveTrip: (trip: ActiveTripSnapshot | null) => void;
};

export function tripRowToSnapshot(row: Tables<'trips'>): ActiveTripSnapshot {
  return {
    id: row.id,
    name: row.name,
    destination_label: row.destination_label,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_by: row.created_by,
  };
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set) => ({
      activeTrip: null,
      setActiveTrip: (trip) => set({ activeTrip: trip }),
    }),
    {
      name: '@routeflow/app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ activeTrip: s.activeTrip }),
    },
  ),
);
