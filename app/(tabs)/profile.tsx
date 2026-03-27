import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '../../components/Avatar';
import { colors } from '../../constants/colors';
import {
  useCompletedTripsCount,
  useProfile,
  useUpdateProfileName,
} from '../../lib/hooks/useProfile';
import { deleteOwnAccount, signOut } from '../../lib/supabase/auth';

function planBadgeLabel(plan: string | undefined): string {
  const p = (plan ?? 'free').toLowerCase();
  if (p === 'plus') {
    return 'Plus plan';
  }
  if (p === 'pro') {
    return 'Pro plan';
  }
  return 'Free plan';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { data: completedCount = 0, isLoading: isCountLoading } =
    useCompletedTripsCount();
  const updateName = useUpdateProfileName();

  const displayName =
    profile?.full_name?.trim() || profile?.display_name?.trim() || 'Traveler';

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
      Alert.alert('Invalid name', 'Name cannot be empty.');
      return;
    }
    updateName.mutate(trimmed, {
      onSuccess: () => setIsEditing(false),
      onError: (e) =>
        Alert.alert('Update failed', e instanceof Error ? e.message : 'Try again'),
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteOwnAccount();
              } catch (e) {
                Alert.alert(
                  'Delete failed',
                  e instanceof Error ? e.message : 'Please try again or contact support.',
                );
              }
            })();
          },
        },
      ],
    );
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
        <Text style={{ marginTop: 12, color: colors.inactive }}>Loading profile...</Text>
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
          {error instanceof Error ? error.message : 'Could not load your profile.'}
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
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
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
          <Text style={{ fontSize: 13, color: colors.inactive, marginBottom: 6 }}>Name</Text>
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
            accessibilityLabel="Edit display name"
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
              <Text style={{ fontWeight: '600', color: colors.text }}>Cancel</Text>
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
              <Text style={{ fontWeight: '600', color: '#ffffff' }}>Save</Text>
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
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit profile</Text>
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
          Trips completed
        </Text>
        {isCountLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
            {completedCount}
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/paywall')}
        style={({ pressed }) => ({
          marginTop: 20,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: '#111827',
          opacity: pressed ? 0.9 : 1,
          alignItems: 'center',
        })}
        accessibilityRole="button"
        accessibilityLabel="Manage subscription"
      >
        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
          Manage Subscription
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void signOut()}
        style={({ pressed }) => ({
          marginTop: 16,
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={{ fontWeight: '600', color: colors.text, fontSize: 16 }}>
          Sign Out
        </Text>
      </Pressable>

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
          Destructive zone
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
          accessibilityLabel="Delete account"
        >
          <Text style={{ fontWeight: '700', color: '#DC2626', fontSize: 16 }}>
            Delete Account
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
