import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/colors';
import { useMyTrips } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { sortTripsForHome } from '../lib/trips/tripUi';

export function TripSwitcher() {
  const { t } = useTranslation('trips');
  const insets = useSafeAreaInsets();
  const { data: trips = [], isLoading } = useMyTrips();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const [open, setOpen] = useState(false);
  const sortedTrips = useMemo(() => sortTripsForHome(trips), [trips]);

  const label =
    activeTrip?.destination_label?.trim() ||
    activeTrip?.name?.trim() ||
    t('switcherLabel');

  if (isLoading || sortedTrips.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 10,
          paddingHorizontal: 16,
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: '#FAFAFA',
          opacity: pressed ? 0.88 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('switcherOpenA11y')}
      >
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.inactive} importantForAccessibility="no" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('closeA11y')}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.sheetTitle}>{t('switchTripTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
              {sortedTrips.map((trip) => {
                const selected = trip.id === activeTrip?.id;
                const rowLabel = trip.destination_label?.trim() || trip.name;
                return (
                  <Pressable
                    key={trip.id}
                    onPress={() => {
                      setActiveTrip(tripRowToSnapshot(trip));
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: selected ? '#FFF3EC' : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: selected ? '700' : '500', color: colors.text }}>
                      {rowLabel}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 2 }}>{trip.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
});
