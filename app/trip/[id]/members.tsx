import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemberChip } from '../../../components/MemberChip';
import { colors } from '../../../constants/colors';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useTripMembersRealtime } from '../../../lib/hooks/useTripMembersRealtime';
import {
  type MemberProfileBrief,
  type TripMemberBrief,
  type TripWithDetails,
  useInviteTripMember,
  useRemoveTripMember,
  useTrip,
} from '../../../lib/hooks/useTrips';
import { showToast } from '../../../lib/showToast';

function memberProfile(trip: TripWithDetails, uid: string): MemberProfileBrief {
  return (
    trip.memberProfiles.find((p) => p.id === uid) ?? {
      id: uid,
      full_name: null,
      display_name: null,
      avatar_url: null,
    }
  );
}

function sortMembers(list: TripMemberBrief[]): TripMemberBrief[] {
  return [...list].sort((a, b) => {
    if (a.role === 'owner' && b.role !== 'owner') {
      return -1;
    }
    if (b.role === 'owner' && a.role !== 'owner') {
      return 1;
    }
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });
}

export default function TripMembersScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['members', 'trips', 'common']);
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const [email, setEmail] = useState('');
  const inviteMut = useInviteTripMember();
  const removeMut = useRemoveTripMember();

  useTripMembersRealtime(tripId);

  const isOwner = useMemo(() => {
    return Boolean(trip?.trip_members.some((m) => m.user_id === userId && m.role === 'owner'));
  }, [trip, userId]);

  const sortedMembers = useMemo(() => (trip ? sortMembers(trip.trip_members) : []), [trip]);

  const onInvite = async () => {
    const trimmed = email.trim();
    if (!tripId || !trimmed) {
      return;
    }
    try {
      const result = await inviteMut.mutateAsync({ tripId, email: trimmed });
      if (result.ok) {
        showToast(t('members:inviteSent'));
        setEmail('');
        return;
      }
      if (result.code === 'user_not_found') {
        showToast(t('members:userNotFound'));
        return;
      }
      showToast(t('members:alreadyMember'));
    } catch {
      showToast(t('members:inviteFailed'));
    }
  };

  const confirmRemove = (member: TripMemberBrief) => {
    const profile = trip ? memberProfile(trip, member.user_id) : null;
    const display = profile?.display_name?.trim() || profile?.full_name?.trim() || t('members:unknownMember');
    Alert.alert(t('members:removeTitle'), t('members:removeMessage', { name: display }), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('members:removeConfirm'),
        style: 'destructive',
        onPress: () => {
          if (tripId) {
            void removeMut.mutateAsync({ tripId, memberUserId: member.user_id });
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !trip || !tripId) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          backgroundColor: colors.background,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('trips:detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ marginTop: 24, fontSize: 17, color: colors.inactive }}>{t('trips:notFound')}</Text>
      </View>
    );
  }

  const inviteDisabled = inviteMut.isPending || !email.trim();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('trips:detailBackA11y')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {t('members:screenTitle')}
        </Text>
      </View>

      <FlatList
        data={sortedMembers}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          isOwner ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('members:inviteSectionTitle')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('members:inviteEmailPlaceholder')}
                placeholderTextColor={colors.inactive}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 12,
                }}
              />
              <Pressable
                onPress={() => void onInvite()}
                disabled={inviteDisabled}
                style={{
                  backgroundColor: inviteDisabled ? colors.border : colors.primarySolid,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel={t('members:sendInvite')}
              >
                {inviteMut.isPending ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '600' }}>{t('members:sendInvite')}</Text>
                )}
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const profile = memberProfile(trip, item.user_id);
          const displayName =
            profile.display_name?.trim() || profile.full_name?.trim() || t('members:unknownMember');
          const joinedDate = new Date(item.joined_at).toLocaleDateString();
          const joinedLabel = t('members:joinedOn', { date: joinedDate });
          const roleLabel = item.role === 'owner' ? t('members:roleOwner') : t('members:roleMember');
          const canSwipeRemove = isOwner && item.user_id !== userId;
          return (
            <View style={{ marginBottom: 10 }}>
              <MemberChip
                displayName={displayName}
                avatarUrl={profile.avatar_url}
                role={item.role}
                joinedLabel={joinedLabel}
                roleLabel={roleLabel}
                ownerBadgeA11y={t('members:ownerBadgeA11y')}
                swipeToRemoveEnabled={canSwipeRemove}
                onRemove={() => confirmRemove(item)}
                removeActionA11y={t('members:removeMemberA11y')}
              />
            </View>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}
