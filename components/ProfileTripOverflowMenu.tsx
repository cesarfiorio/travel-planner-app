import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { TripWithDetails } from '../lib/hooks/useTrips';
import { useDeleteTrip } from '../lib/hooks/useTrips';

type Props = {
  trip: TripWithDetails;
  currentUserId: string;
  /** Pill on hero image (light background); default is plain icon on white cards. */
  variant?: 'default' | 'onPhoto';
  /** Trip title for accessibility (short label on menu). */
  tripLabel: string;
};

export function ProfileTripOverflowMenu({ trip, currentUserId, variant = 'default', tripLabel }: Props) {
  const { t } = useTranslation(['trips', 'common']);
  const router = useRouter();
  const deleteTrip = useDeleteTrip();
  const [menuOpen, setMenuOpen] = useState(false);

  const isCreator = trip.created_by === currentUserId;
  if (!isCreator) {
    return null;
  }

  const runDelete = () => {
    setMenuOpen(false);
    Alert.alert(t('trips:deleteTitle'), t('trips:deleteMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('trips:deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void deleteTrip.mutate(trip.id, {
            onError: () => {
              Alert.alert(t('common:somethingWentWrong'), t('trips:errorDeleteFailed'));
            },
          });
        },
      },
    ]);
  };

  const openEdit = () => {
    setMenuOpen(false);
    router.push(`/trip/${trip.id}/edit`);
  };

  const iconColor = variant === 'onPhoto' ? '#111827' : '#374151';
  const triggerStyle =
    variant === 'onPhoto'
      ? {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.95)',
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        }
      : {
          width: 44,
          height: 44,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        };

  return (
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [triggerStyle, { opacity: pressed ? 0.85 : 1 }]}
        hitSlop={variant === 'onPhoto' ? 6 : 10}
        accessibilityRole="button"
        accessibilityLabel={t('trips:pastTripsMenuA11y', { name: tripLabel })}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={iconColor} />
      </Pressable>

      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              paddingBottom: Platform.OS === 'ios' ? 34 : 24,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
              {t('trips:tripOptionsTitle')}
            </Text>
            <Pressable onPress={openEdit} style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 17, color: colors.text }}>{t('trips:editTripTitle')}</Text>
            </Pressable>
            <Pressable onPress={runDelete} style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 17, color: '#DC2626' }}>{t('trips:actionDelete')}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={{ paddingVertical: 14, marginTop: 8 }}>
              <Text style={{ fontSize: 17, color: colors.primary, fontWeight: '600' }}>{t('common:cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
