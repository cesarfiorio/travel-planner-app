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
  /** Day (1-based) new explore / place-detail adds go onto; synced from itinerary tab. */
  itineraryAddDayNumber: number;
  setItineraryAddDayNumber: (day: number) => void;
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
    (set, get) => ({
      activeTrip: null,
      itineraryAddDayNumber: 1,
      setActiveTrip: (trip) =>
        set((state) => {
          const prevId = state.activeTrip?.id ?? null;
          const nextId = trip?.id ?? null;
          return {
            activeTrip: trip,
            itineraryAddDayNumber: prevId === nextId ? state.itineraryAddDayNumber : 1,
          };
        }),
      setItineraryAddDayNumber: (day) => {
        const n = Math.floor(Number(day));
        if (!Number.isFinite(n) || n < 1) {
          return;
        }
        if (get().itineraryAddDayNumber === n) {
          return;
        }
        set({ itineraryAddDayNumber: n });
      },
    }),
    {
      name: '@routeflow/app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ activeTrip: s.activeTrip }),
    },
  ),
);
