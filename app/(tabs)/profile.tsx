import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/ui';
import { LanguagePicker } from '../../components/LanguagePicker';
import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import { useSavedRoutes } from '../../lib/hooks/useCommunityRoutes';
import {
  useCompletedTripsCount,
  useProfile,
  useUpdateProfileName,
} from '../../lib/hooks/useProfile';
import { deleteOwnAccount, signOut } from '../../lib/supabase/auth';

import type { CommunityRouteVm } from '../../lib/hooks/useCommunityRoutes';

function savedRouteTipPreview(tip: string | null | undefined): string {
  const s = (tip ?? '').trim();
  if (s.length <= 60) {
    return s;
  }
  return `${s.slice(0, 60)}…`;
}

export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'common', 'community']);
  const router = useRouter();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { data: completedCount = 0, isLoading: isCountLoading } =
    useCompletedTripsCount();
  const { data: savedRoutes = [], isLoading: savedRoutesLoading } = useSavedRoutes();
  const updateName = useUpdateProfileName();

  const planBadgeLabel = (plan: string | undefined): string => {
    const p = (plan ?? 'free').toLowerCase();
    if (p === 'plus') {
      return t('profile:planPlus');
    }
    if (p === 'pro') {
      return t('profile:planPro');
    }
    if (p === 'explorer') {
      return t('profile:planExplorer');
    }
    return t('profile:planFree');
  };

  const displayName =
    profile?.full_name?.trim() || profile?.display_name?.trim() || t('profile:travelerFallback');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(displayName);

  useEffect(() => {
    if (!isEditing) {
      setEditName(displayName);
    }
  }, [displayName, isEditing]);

  const startEdit = () => {
    setEditName(displayName);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditName(displayName);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert(t('profile:invalidNameTitle'), t('profile:invalidNameMessage'));
      return;
    }
    updateName.mutate(trimmed, {
      onSuccess: () => setIsEditing(false),
      onError: (e) =>
        Alert.alert(t('common:updateFailed'), formatErrorMessage(e, t('common:tryAgain'))),
    });
  };

  const confirmDelete = () => {
    Alert.alert(t('profile:deleteAccountTitle'), t('profile:deleteAccountMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('profile:deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteOwnAccount();
            } catch (e) {
              Alert.alert(
                t('common:deleteFailed'),
                e instanceof Error ? e.message : t('common:tryAgainSupport'),
              );
            }
          })();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.inactive }}>{t('common:loadingProfile')}</Text>
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, textAlign: 'center', marginBottom: 16 }}>
          {error instanceof Error ? error.message : t('common:couldNotLoadProfile')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor: colors.primary,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>{t('common:retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      nestedScrollEnabled
    >
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Avatar name={displayName} imageUrl={profile.avatar_url} size={96} />
        <View
          style={{
            marginTop: 12,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: '#FFF3EC',
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
            {planBadgeLabel(profile.plan)}
          </Text>
        </View>
      </View>

      {isEditing ? (
        <>
          <Text style={{ fontSize: 13, color: colors.inactive, marginBottom: 6 }}>{t('common:name')}</Text>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 14,
              fontSize: 17,
              color: colors.text,
              marginBottom: 16,
            }}
            autoCapitalize="words"
            accessibilityLabel={t('profile:editDisplayNameA11y')}
          />
          <View style={{ flexDirection: 'row' }}>
            <Pressable
              onPress={cancelEdit}
              style={{
                flex: 1,
                marginRight: 8,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '600', color: colors.text }}>{t('common:cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={saveEdit}
              disabled={updateName.isPending}
              style={{
                flex: 1,
                marginLeft: 8,
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: 'center',
                opacity: updateName.isPending ? 0.7 : 1,
              }}
            >
              <Text style={{ fontWeight: '600', color: '#ffffff' }}>{t('common:save')}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {displayName}
          </Text>
          <Pressable onPress={startEdit} style={{ alignSelf: 'center', marginBottom: 24 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('profile:editProfile')}</Text>
          </Pressable>
        </>
      )}

      <View
        style={{
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 14, color: colors.inactive, marginBottom: 4 }}>
          {t('profile:tripsCompleted')}
        </Text>
        {isCountLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
            {completedCount}
          </Text>
        )}
      </View>

      <View
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
          {t('profile:savedRoutes')}
        </Text>
        {savedRoutesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
        ) : savedRoutes.length === 0 ? (
          <View>
            <Text style={{ fontSize: 14, color: colors.inactive, lineHeight: 20, marginBottom: 12 }}>
              {t('profile:savedRoutesEmpty')}
            </Text>
            <Button
              label={t('profile:savedRoutesBrowseCommunity')}
              onPress={() => router.push('/(tabs)/community')}
              variant="outline"
              size="md"
              accessibilityLabel={t('profile:savedRoutesBrowseCommunity')}
            />
          </View>
        ) : (
          <FlatList
            horizontal
            data={savedRoutes}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            renderItem={({ item: r }: { item: CommunityRouteVm }) => {
              const dest = r.destination?.trim() || r.title;
              const durationLabel =
                r.duration_days != null
                  ? t('community:durationDays', { count: r.duration_days })
                  : t('community:durationUnknown');
              const preview = savedRouteTipPreview(r.tip);
              return (
                <Pressable
                  onPress={() => router.push(`/(stack)/community/${r.id}`)}
                  style={{
                    width: 228,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: '#fff',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={dest}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }} numberOfLines={2}>
                    {dest}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 6 }} numberOfLines={1}>
                    {r.creatorName}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.inactive, marginTop: 4 }} numberOfLines={1}>
                    {durationLabel}
                  </Text>
                  {preview ? (
                    <Text style={{ fontSize: 12, color: colors.text, marginTop: 8, lineHeight: 16 }} numberOfLines={2}>
                      {preview}
                    </Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <View
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          {t('common:settings')}
        </Text>
        <LanguagePicker />
      </View>

      <View style={{ marginTop: 20 }}>
        <Button
          label={t('profile:manageSubscription')}
          onPress={() => router.push('/(stack)/paywall')}
          variant="outline"
          size="lg"
          fullWidth
          accessibilityLabel={t('profile:manageSubscriptionA11y')}
        />
      </View>

      <View style={{ marginTop: 16 }}>
        <Button
          label={t('profile:signOut')}
          onPress={() => void signOut()}
          variant="destructive"
          size="lg"
          fullWidth
          accessibilityLabel={t('profile:signOutA11y')}
        />
      </View>

      <View
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTopWidth: 1,
          borderTopColor: '#FECACA',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: '#DC2626',
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {t('profile:destructiveZone')}
        </Text>
        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => ({
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#DC2626',
            alignItems: 'center',
            opacity: pressed ? 0.9 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('profile:deleteAccountA11y')}
        >
          <Text style={{ fontWeight: '700', color: '#DC2626', fontSize: 16 }}>
            {t('profile:deleteAccount')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
