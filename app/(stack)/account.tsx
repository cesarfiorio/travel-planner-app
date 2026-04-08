import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/ui/Card';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { COLORS, FONT, LAYOUT, RADIUS, SHADOW, SPACING } from '../../constants/theme';
import { formatErrorMessage } from '../../lib/formatError';
import { isAppLanguageCode, setAppLanguage, type AppLanguageCode } from '../../lib/i18n';
import { useAuth } from '../../lib/hooks/useAuth';
import { profileQueryKey, useProfile, useSaveProfile } from '../../lib/hooks/useProfile';
import { uploadProfileAvatar } from '../../lib/storage/uploadProfileAvatar';
import { deleteOwnAccount, signOut } from '../../lib/supabase/auth';
import { hasSupabaseEnv, supabase } from '../../lib/supabase';

function languageCodeFromI18n(i18nLanguage: string): AppLanguageCode {
  const base = i18nLanguage.split('-')[0] ?? 'en';
  return isAppLanguageCode(base) ? base : 'en';
}

export default function AccountScreen() {
  const { t, i18n } = useTranslation(['profile', 'common', 'trips']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const saveProfile = useSaveProfile();

  const [fullNameDraft, setFullNameDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [langModal, setLangModal] = useState(false);
  const avatarBusy = useMutation({
    mutationFn: async (localUri: string) => {
      if (!supabase || !hasSupabaseEnv || !userId) {
        throw new Error('Not configured');
      }
      const url = await uploadProfileAvatar(localUri, userId);
      if (!url) {
        throw new Error('Upload failed');
      }
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (upErr) {
        throw upErr;
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    },
  });

  const displayName =
    profile?.full_name?.trim() || profile?.display_name?.trim() || t('profile:travelerFallback');

  useEffect(() => {
    if (!profile) {
      return;
    }
    setFullNameDraft(profile.full_name?.trim() || profile.display_name?.trim() || '');
    setBioDraft(profile.bio?.trim() ?? '');
  }, [profile?.id, profile?.full_name, profile?.display_name, profile?.bio]);

  const activeLangCode = useMemo(() => languageCodeFromI18n(i18n.language), [i18n.language]);
  const activeLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === activeLangCode)?.nativeName ??
    SUPPORTED_LANGUAGES[0]?.nativeName;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profile:photoPermissionTitle'), t('profile:photoPermissionMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]?.uri) {
      return;
    }
    avatarBusy.mutate(res.assets[0].uri, {
      onError: (e) =>
        Alert.alert(
          t('common:somethingWentWrong'),
          formatErrorMessage(e, t('profile:photoPickFailed')),
        ),
    });
  };

  const onSave = () => {
    const trimmed = fullNameDraft.trim();
    if (!trimmed) {
      Alert.alert(t('profile:invalidNameTitle'), t('profile:invalidNameMessage'));
      return;
    }
    saveProfile.mutate(
      { fullName: trimmed, bio: bioDraft.trim() || null },
      {
        onError: (e) =>
          Alert.alert(t('common:updateFailed'), formatErrorMessage(e, t('common:tryAgain'))),
      },
    );
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

  const fieldLabelStyle = {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  };
  const fieldValueStyle = {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    padding: 0,
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.pageBg,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.md, fontSize: FONT.base, color: COLORS.textSecondary }}>
          {t('common:loadingProfile')}
        </Text>
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
          padding: SPACING.xl,
          backgroundColor: COLORS.pageBg,
        }}
      >
        <Text style={{ color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.lg }}>
          {error instanceof Error ? error.message : t('common:couldNotLoadProfile')}
        </Text>
        <PrimaryButton label={t('common:retry')} onPress={() => void refetch()} variant="outline" size="md" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.pageBg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: SPACING.md,
          paddingHorizontal: SPACING.xl,
          backgroundColor: COLORS.cardBg,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={SPACING.md}
          accessibilityRole="button"
          accessibilityLabel={t('profile:accountBackA11y')}
        >
          <Ionicons name="arrow-back" size={FONT.xxl + SPACING.xs} color={COLORS.textPrimary} />
        </Pressable>
        <Text
          style={{
            marginLeft: SPACING.sm,
            fontSize: FONT.h1,
            fontWeight: FONT.bold,
            color: COLORS.textPrimary,
          }}
        >
          {t('profile:accountTitle')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.xxxl + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
      >
        <View style={{ alignSelf: 'center', marginBottom: SPACING.xl }}>
          <View style={{ position: 'relative' }}>
            <Avatar name={displayName} imageUrl={profile.avatar_url} size={LAYOUT.profileAvatarLarge} />
            <Pressable
              onPress={() => void pickAvatar()}
              disabled={avatarBusy.isPending}
              style={({ pressed }) => ({
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: LAYOUT.profileCameraFab,
                height: LAYOUT.profileCameraFab,
                borderRadius: RADIUS.circle,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || avatarBusy.isPending ? 0.85 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={t('profile:changePhotoA11y')}
            >
              {avatarBusy.isPending ? (
                <ActivityIndicator color={COLORS.textOnPrimary} size="small" />
              ) : (
                <Ionicons name="camera" size={FONT.lg} color={COLORS.textOnPrimary} />
              )}
            </Pressable>
          </View>
        </View>

        <Card style={{ marginBottom: SPACING.md }} padding={SPACING.lg}>
          <Text style={fieldLabelStyle}>{t('profile:fullNameLabel')}</Text>
          <TextInput
            value={fullNameDraft}
            onChangeText={setFullNameDraft}
            style={fieldValueStyle}
            autoCapitalize="words"
            placeholderTextColor={COLORS.textTertiary}
          />
        </Card>

        <Card style={{ marginBottom: SPACING.md }} padding={SPACING.lg}>
          <Text style={fieldLabelStyle}>{t('profile:emailLabel')}</Text>
          <Text style={fieldValueStyle}>{user?.email ?? '—'}</Text>
        </Card>

        <Card style={{ marginBottom: SPACING.md }} padding={SPACING.lg}>
          <Text style={fieldLabelStyle}>{t('profile:aboutMeLabel')}</Text>
          <TextInput
            value={bioDraft}
            onChangeText={setBioDraft}
            style={[fieldValueStyle, { fontWeight: FONT.regular, minHeight: SPACING.xxxl * 2 }]}
            multiline
            textAlignVertical="top"
            placeholder={t('profile:aboutMePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
          />
        </Card>

        <Card style={{ marginBottom: SPACING.xl }} padding={SPACING.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
            <Ionicons name="globe-outline" size={FONT.xl} color={COLORS.textPrimary} style={{ marginRight: SPACING.sm }} />
            <Text style={{ fontSize: FONT.lg, fontWeight: FONT.semibold, color: COLORS.textPrimary }}>
              {t('profile:languageCardTitle')}
            </Text>
          </View>
          <Pressable
            onPress={() => setLangModal(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.9 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={t('profile:selectLanguageTitle')}
          >
            <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary }}>
              {activeLangLabel}
            </Text>
            <Ionicons name="chevron-down" size={FONT.xl} color={COLORS.textTertiary} />
          </Pressable>
        </Card>

        <View
          style={{
            gap: SPACING.lg,
            paddingTop: SPACING.sm,
            paddingBottom: SPACING.lg,
            overflow: 'visible',
          }}
        >
          <View style={{ position: 'relative', zIndex: 1 }}>
            <PrimaryButton
              label={t('profile:saveChanges')}
              onPress={onSave}
              size="lg"
              variant="filled"
              fullWidth
              floating
              loading={saveProfile.isPending}
              disabled={saveProfile.isPending}
            />
          </View>

          <View style={{ position: 'relative', zIndex: 2 }}>
            <Pressable
              {...{ cssInterop: false }}
              onPress={() => void signOut()}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: RADIUS.circle,
                backgroundColor: COLORS.cardBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.sm,
                opacity: pressed ? 0.92 : 1,
                alignSelf: 'stretch',
                ...SHADOW.pill,
              })}
              accessibilityRole="button"
              accessibilityLabel={t('profile:signOutA11y')}
            >
              <Ionicons name="log-out-outline" size={FONT.xl} color={COLORS.textPrimary} />
              <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary }}>
                {t('profile:signOut')}
              </Text>
            </Pressable>
          </View>

          <View style={{ position: 'relative', zIndex: 3 }}>
            <Pressable
              {...{ cssInterop: false }}
              onPress={confirmDelete}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: RADIUS.circle,
                borderWidth: 1,
                borderColor: COLORS.dangerBorder,
                backgroundColor: COLORS.cardBg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.sm,
                opacity: pressed ? 0.92 : 1,
                alignSelf: 'stretch',
                ...SHADOW.pill,
              })}
              accessibilityRole="button"
              accessibilityLabel={t('profile:deleteAccountA11y')}
            >
              <Ionicons name="trash-outline" size={FONT.xl} color={COLORS.danger} />
              <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.danger }}>
                {t('profile:deleteAccount')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={langModal} animationType="slide" transparent={false} onRequestClose={() => setLangModal(false)}>
        <View style={{ flex: 1, paddingTop: insets.top + SPACING.lg, backgroundColor: COLORS.pageBg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: SPACING.xl,
              marginBottom: SPACING.lg,
            }}
          >
            <Text style={{ fontSize: FONT.h2, fontWeight: FONT.bold, color: COLORS.textPrimary }}>
              {t('profile:selectLanguageTitle')}
            </Text>
            <Pressable onPress={() => setLangModal(false)} hitSlop={SPACING.md}>
              <Text style={{ fontSize: FONT.lg, fontWeight: FONT.semibold, color: COLORS.primary }}>
                {t('trips:close')}
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={[...SUPPORTED_LANGUAGES]}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingHorizontal: SPACING.xl }}
            renderItem={({ item }) => {
              const sel = item.code === activeLangCode;
              return (
                <Pressable
                  onPress={() => {
                    void setAppLanguage(item.code as AppLanguageCode);
                    setLangModal(false);
                  }}
                  style={{
                    paddingVertical: SPACING.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: FONT.xxl, marginRight: SPACING.md }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT.lg, fontWeight: FONT.semibold, color: COLORS.textPrimary }}>
                      {item.nativeName}
                    </Text>
                    <Text style={{ fontSize: FONT.sm, color: COLORS.textSecondary }}>{item.name}</Text>
                  </View>
                  {sel ? <Ionicons name="checkmark-circle" size={FONT.xl} color={COLORS.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
