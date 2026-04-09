import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../constants/colors';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useTripMemoryByTripId } from '../../../lib/hooks/useTripMemory';
import { useDeleteTrip, useTrip } from '../../../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../../../lib/store/appStore';

function tripLifecycleStep(status: string): 0 | 1 | 2 {
  if (status === 'planning') {
    return 0;
  }
  if (status === 'active') {
    return 1;
  }
  return 2;
}

type ActionCardProps = {
  emoji: string;
  label: string;
  onPress: () => void;
  a11y: string;
};

function ActionCard({ emoji, label, onPress, a11y }: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '47%',
        minHeight: 96,
        marginBottom: 14,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TripDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('trips');
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const { data: tripMemory } = useTripMemoryByTripId(tripId);
  const deleteTripMut = useDeleteTrip();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  useEffect(() => {
    if (trip) {
      setActiveTrip(tripRowToSnapshot(trip));
    }
  }, [trip, setActiveTrip]);

  const isOwner = useMemo(() => {
    return Boolean(trip?.trip_members.some((m) => m.user_id === userId && m.role === 'owner'));
  }, [trip, userId]);

  const confirmDeleteTrip = () => {
    if (!tripId || !trip) {
      return;
    }
    Alert.alert(t('deleteTripTitle'), t('deleteTripBody', { name: trip.name }), [
      { text: t('cancel', { ns: 'common' }), style: 'cancel' },
      {
        text: t('deleteTripConfirm'),
        style: 'destructive',
        onPress: () => {
          deleteTripMut.mutate(tripId, {
            onSuccess: () => {
              setActiveTrip(null);
              router.replace('/(tabs)/home');
            },
            onError: (e) => Alert.alert(t('errorTitle'), formatErrorMessage(e, t('errorDeleteTrip'))),
          });
        },
      },
    ]);
  };

  const lifecycleStep = trip ? tripLifecycleStep(trip.status) : 0;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !trip) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          backgroundColor: colors.background,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 24, fontSize: 17, color: colors.inactive }}>{t('notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {trip.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {isOwner ? (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: lifecycleStep === 0 ? colors.primarySolid : colors.inactive,
                }}
              >
                {t('statusPlanning')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.border} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: lifecycleStep === 1 ? colors.primarySolid : colors.inactive,
                }}
              >
                {t('statusActive')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.border} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: lifecycleStep === 2 ? colors.primarySolid : colors.inactive,
                }}
              >
                {t('statusCompleted')}
              </Text>
            </View>
            {trip.status === 'active' ? (
              <Pressable
                onPress={() => {
                  setActiveTrip(tripRowToSnapshot(trip));
                  router.push(`/trip/${trip.id}/finish`);
                }}
                style={{
                  backgroundColor: colors.primarySolid,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel={t('finishTripA11y')}
              >
                <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '600' }}>{t('finishTrip')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={{ fontSize: 16, color: colors.inactive, lineHeight: 24, marginBottom: 20 }}>{t('detailHubSubtitle')}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <ActionCard
            emoji="🔍"
            label={t('actionExplore')}
            a11y={t('actionExplore')}
            onPress={() => {
              setActiveTrip(tripRowToSnapshot(trip));
              router.push('/(tabs)/explore');
            }}
          />
          <ActionCard
            emoji="🗺"
            label={t('actionItinerary')}
            a11y={t('actionItinerary')}
            onPress={() => {
              setActiveTrip(tripRowToSnapshot(trip));
              router.push('/(tabs)/itinerary');
            }}
          />
          <ActionCard
            emoji="💸"
            label={t('actionExpenses')}
            a11y={t('actionExpenses')}
            onPress={() => {
              setActiveTrip(tripRowToSnapshot(trip));
              router.push('/(tabs)/expenses');
            }}
          />
          <ActionCard
            emoji="👥"
            label={t('actionMembers')}
            a11y={t('actionMembers')}
            onPress={() => {
              setActiveTrip(tripRowToSnapshot(trip));
              router.push(`/trip/${trip.id}/members`);
            }}
          />
          {trip.status === 'completed' ? (
            <ActionCard
              emoji="✨"
              label={tripMemory ? t('actionMemory') : t('actionMemoryEmpty')}
              a11y={t('actionMemory')}
              onPress={() => {
                setActiveTrip(tripRowToSnapshot(trip));
                router.push(`/trip/${trip.id}/memory`);
              }}
            />
          ) : null}
        </View>

        {isOwner ? (
          <Pressable
            onPress={confirmDeleteTrip}
            disabled={deleteTripMut.isPending}
            style={({ pressed }) => ({
              marginTop: 32,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#FECACA',
              backgroundColor: '#FEF2F2',
              alignItems: 'center',
              opacity: deleteTripMut.isPending ? 0.5 : pressed ? 0.85 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={t('deleteTrip')}
          >
            {deleteTripMut.isPending ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626' }}>{t('deleteTrip')}</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
