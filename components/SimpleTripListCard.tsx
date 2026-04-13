import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { ProfileTripOverflowMenu } from './ProfileTripOverflowMenu';

import type { TripWithDetails } from '../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../lib/store/appStore';
import { formatTripHeroDateRange } from '../lib/trips/tripDateFormat';
import { isTripOnOrAfterEndDateLocal, primaryTripEntryPath } from '../lib/trips/tripUi';

const CARD_RADIUS = 12;
const CARD_BORDER = '#E5E7EB';

type Props = {
  trip: TripWithDetails;
  locale: string;
  /** When true (e.g. profile tab), tap only sets the active trip for the tab bar—no trip hub navigation. */
  selectActiveOnly?: boolean;
  /** Profile tab: overflow menu with edit / delete for trips you created. */
  showProfileOverflow?: boolean;
  currentUserId?: string;
};

export function SimpleTripListCard({
  trip,
  locale,
  selectActiveOnly = false,
  showProfileOverflow = false,
  currentUserId = '',
}: Props) {
  const { t } = useTranslation('trips');
  const router = useRouter();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const title = trip.name?.trim() || trip.destination_label?.trim() || t('detailTitle');
  const dateLine = formatTripHeroDateRange(trip.start_date, trip.end_date, locale);
  const showOverflowTrigger =
    showProfileOverflow && Boolean(currentUserId) && trip.created_by === currentUserId;

  /** Profile list: on the last day (or after), same as featured card — open recap / community finish. */
  const showCompleteInsteadOfSwitch = selectActiveOnly && isTripOnOrAfterEndDateLocal(trip);

  const open = () => {
    setActiveTrip(tripRowToSnapshot(trip));
    if (!selectActiveOnly) {
      router.push(primaryTripEntryPath(trip));
      return;
    }
    if (showCompleteInsteadOfSwitch) {
      router.push(`/trip/${trip.id}/finish`);
    }
  };

  /** Shadow + elevation on `Pressable` is unreliable (especially Android). Outer `View` carries the card chrome. */
  /** Overflow is absolutely positioned so it stays on the right edge (flex row was collapsing on some layouts). */
  const contentPadRight = showOverflowTrigger ? 48 : 16;

  return (
    <View
      style={{
        position: 'relative',
        alignSelf: 'stretch',
        marginBottom: 12,
        borderRadius: CARD_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.01,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={open}
        style={({ pressed }) => ({
          borderRadius: CARD_RADIUS,
          opacity: pressed ? 0.92 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={
          selectActiveOnly
            ? showCompleteInsteadOfSwitch
              ? t('featuredCompleteTripA11y')
              : t('switchTripTitle')
            : undefined
        }
      >
        <View
          style={{
            paddingVertical: 16,
            paddingLeft: 16,
            paddingRight: contentPadRight,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
            {title}
          </Text>
          {dateLine ? (
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{dateLine}</Text>
          ) : (
            <View style={{ marginTop: 2 }} />
          )}
        </View>
      </Pressable>
      {showOverflowTrigger ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: 4,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <ProfileTripOverflowMenu trip={trip} currentUserId={currentUserId} tripLabel={title} />
        </View>
      ) : null}
    </View>
  );
}
