import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../constants/colors';
import type { TripWithDetails } from '../lib/hooks/useTrips';
import { useDeleteTrip, useUpdateTrip } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import {
  coverGradientFromDestination,
  dayIndexInTrip,
  deriveTripUiStatus,
  diffDays,
  parseLocalDate,
  primaryTripEntryPath,
  startOfDay,
  tripDurationDays,
} from '../lib/trips/tripUi';

type Props = {
  trip: TripWithDetails;
  variant: 'highlighted' | 'default';
  currentUserId: string;
};

function memberLabel(p: { full_name: string | null; display_name: string | null }): string {
  return p.display_name?.trim() || p.full_name?.trim() || '?';
}

function initialsFromName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return full.slice(0, 2).toUpperCase() || '?';
}

export function TripCard({ trip, variant, currentUserId }: Props) {
  const { t, i18n } = useTranslation(['trips', 'common']);
  const router = useRouter();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(trip.name);

  const locale =
    i18n.language.split('-')[0] === 'pt'
      ? 'pt-BR'
      : i18n.language.split('-')[0] === 'en'
        ? 'en-US'
        : i18n.language;

  const uiStatus = deriveTripUiStatus(trip);
  const [c1, c2] = coverGradientFromDestination(trip.destination_label);

  const isCreator = trip.created_by === currentUserId;
  const canManage =
    isCreator || trip.trip_members.some((m) => m.user_id === currentUserId && m.role === 'owner');

  const timingLine = useMemo(() => {
    const today = startOfDay(new Date());
    const start = parseLocalDate(trip.start_date);
    const end = parseLocalDate(trip.end_date);
    if (uiStatus === 'archived') {
      return t('trips:statusArchived');
    }
    if (!start || !end) {
      return '';
    }
    if (uiStatus === 'planning') {
      const d = diffDays(today, start);
      if (d === 0) {
        return t('trips:daysStartsToday');
      }
      return t('trips:daysUntil', { count: d });
    }
    if (uiStatus === 'active') {
      const total = tripDurationDays(start, end);
      const current = dayIndexInTrip(today, start, end);
      const left = diffDays(today, end);
      return `${t('trips:dayInProgress', { current, total })} · ${t('trips:daysLeft', { count: left })}`;
    }
    const since = diffDays(end, today);
    if (since === 0) {
      return t('trips:endedToday');
    }
    return t('trips:daysSinceEnd', { count: since });
  }, [trip.start_date, trip.end_date, uiStatus, t]);

  const statusLabel = useMemo(() => {
    switch (uiStatus) {
      case 'planning':
        return t('trips:statusPlanning');
      case 'active':
        return t('trips:statusActive');
      case 'completed':
        return t('trips:statusCompleted');
      default:
        return t('trips:statusArchived');
    }
  }, [uiStatus, t]);

  const statusColors = useMemo(() => {
    switch (uiStatus) {
      case 'planning':
        return { bg: '#F3F4F6', fg: '#4B5563' };
      case 'active':
        return { bg: '#DCFCE7', fg: '#166534' };
      case 'completed':
        return { bg: '#DBEAFE', fg: '#1D4ED8' };
      default:
        return { bg: '#F3F4F6', fg: '#6B7280' };
    }
  }, [uiStatus]);

  const dateRange =
    trip.start_date && trip.end_date
      ? `${new Date(trip.start_date + 'T12:00:00').toLocaleDateString(locale)} – ${new Date(trip.end_date + 'T12:00:00').toLocaleDateString(locale)}`
      : '';

  const trimmedName = trip.name?.trim() ?? '';
  const trimmedDest = trip.destination_label?.trim() ?? '';
  const titleText = trimmedName || trimmedDest || t('trips:detailTitle');
  const subtitleText =
    trimmedName && trimmedDest
      ? trimmedDest
      : trimmedName
        ? trimmedDest || t('trips:noDestination')
        : null;

  const memberCount = trip.trip_members.length;
  const overflow = Math.max(0, trip.memberProfiles.length - 4);

  const openDetail = () => {
    setActiveTrip(tripRowToSnapshot(trip));
    router.push(primaryTripEntryPath(trip));
  };

  const runArchive = () => {
    setMenuOpen(false);
    Alert.alert(t('trips:archiveTitle'), t('trips:archiveMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('trips:archiveConfirm'),
        style: 'destructive',
        onPress: () => {
          void updateTrip.mutate(
            { id: trip.id, status: 'cancelled' },
            {
              onError: () => {
                Alert.alert(t('common:somethingWentWrong'), t('trips:errorUpdateFailed'));
              },
            },
          );
        },
      },
    ]);
  };

  const runDelete = () => {
    setMenuOpen(false);
    if (!isCreator) {
      return;
    }
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

  const saveRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      return;
    }
    setRenameOpen(false);
    void updateTrip.mutate(
      { id: trip.id, name: trimmed },
      {
        onError: () => {
          Alert.alert(t('common:somethingWentWrong'), t('trips:errorUpdateFailed'));
        },
      },
    );
  };

  return (
    <>
      <Pressable
        onPress={openDetail}
        onLongPress={() => {
          if (canManage) {
            setRenameValue(trip.name);
            setMenuOpen(true);
          }
        }}
        delayLongPress={400}
        style={({ pressed }) => ({
          borderRadius: 16,
          marginBottom: 12,
          overflow: 'hidden',
          borderWidth: variant === 'highlighted' ? 2 : 1,
          borderColor: variant === 'highlighted' ? colors.primary : colors.border,
          opacity: pressed ? 0.96 : 1,
        })}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 96, minHeight: 96, width: '100%' }}
        />
        <View style={{ padding: 16, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }} numberOfLines={2}>
            {titleText}
          </Text>
          {subtitleText ? (
            <Text style={{ fontSize: 15, color: colors.inactive, marginTop: 4 }} numberOfLines={2}>
              {subtitleText}
            </Text>
          ) : null}
          {dateRange ? (
            <Text style={{ fontSize: 13, color: colors.inactive, marginTop: 8 }}>{dateRange}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10, gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: statusColors.bg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: statusColors.fg }}>{statusLabel}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.inactive }}>{t('trips:memberCount', { count: memberCount })}</Text>
          </View>
          {timingLine ? (
            <Text style={{ fontSize: 13, color: colors.text, marginTop: 8 }}>{timingLine}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            {trip.memberProfiles.slice(0, 4).map((p) => (
              <View
                key={p.id}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  marginRight: -6,
                  borderWidth: 2,
                  borderColor: '#fff',
                  overflow: 'hidden',
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {p.avatar_url ? (
                  <Image source={{ uri: p.avatar_url }} style={{ width: 36, height: 36 }} />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                    {initialsFromName(memberLabel(p))}
                  </Text>
                )}
              </View>
            ))}
            {overflow > 0 ? (
              <Text style={{ marginLeft: 12, fontSize: 13, color: colors.inactive }}>
                {t('trips:membersMore', { count: overflow })}
              </Text>
            ) : null}
          </View>
        </View>
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
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setRenameValue(trip.name);
                setRenameOpen(true);
              }}
              style={{ paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 17, color: colors.text }}>{t('trips:actionRename')}</Text>
            </Pressable>
            <Pressable onPress={runArchive} style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 17, color: colors.text }}>{t('trips:actionArchive')}</Text>
            </Pressable>
            {isCreator ? (
              <Pressable onPress={runDelete} style={{ paddingVertical: 14 }}>
                <Text style={{ fontSize: 17, color: '#DC2626' }}>{t('trips:actionDelete')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setMenuOpen(false)} style={{ paddingVertical: 14, marginTop: 8 }}>
              <Text style={{ fontSize: 17, color: colors.primary, fontWeight: '600' }}>{t('common:cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={renameOpen} animationType="fade" transparent onRequestClose={() => setRenameOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setRenameOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', marginBottom: 12 }}>{t('trips:renameTitle')}</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t('trips:renamePlaceholder')}
              placeholderTextColor={colors.inactive}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 17,
                color: colors.text,
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
              <Pressable onPress={() => setRenameOpen(false)}>
                <Text style={{ fontSize: 17, color: colors.inactive }}>{t('common:cancel')}</Text>
              </Pressable>
              <Pressable onPress={saveRename}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('trips:renameSave')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
