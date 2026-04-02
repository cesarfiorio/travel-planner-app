import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui';
import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import type { TravelStyleId } from '../../lib/community/constants';
import { useCanImport, useQuickImportTrip } from '../../lib/hooks/useImportTrip';
import { useSubscription } from '../../lib/hooks/useSubscription';
import { countryFlag, guessCountryFromDestination, getCountry } from '../../lib/utils/countryUtils';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Display order: matches friendly labels in `trips:importTravelStyle_*`. */
const IMPORT_TRAVEL_STYLES: TravelStyleId[] = ['solo', 'couple', 'group', 'family', 'backpacker'];

const TRAVEL_STYLE_EMOJI: Record<TravelStyleId, string> = {
  solo: '🧳',
  couple: '💑',
  group: '👯',
  family: '👨‍👩‍👧‍👦',
  backpacker: '🎒',
};

function currentYear(): number {
  return new Date().getFullYear();
}

function yearOptions(): number[] {
  const now = currentYear();
  const years: number[] = [];
  for (let y = now; y >= now - 30; y--) {
    years.push(y);
  }
  return years;
}

export default function ImportTripScreen() {
  const { t } = useTranslation('trips');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExplorer } = useSubscription();
  const canImport = useCanImport();
  const quickImport = useQuickImportTrip();

  const [destination, setDestination] = useState('');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(currentYear());
  const [travelStyle, setTravelStyle] = useState<TravelStyleId>('group');
  const [tip, setTip] = useState('');
  const [shareToCommunity, setShareToCommunity] = useState(true);

  const detectedCode = destination.trim() ? guessCountryFromDestination(destination) : null;
  const detectedCountry = detectedCode ? getCountry(detectedCode) : null;
  const flag = detectedCode ? countryFlag(detectedCode) : null;

  const onSubmit = () => {
    const trimDest = destination.trim();
    if (!trimDest) {
      Alert.alert(t('importErrorTitle'), t('importDestRequired'));
      return;
    }
    if (!canImport) {
      Alert.alert(t('importErrorTitle'), t('importRateLimit'));
      return;
    }

    quickImport.mutate(
      {
        destination: trimDest,
        monthYear: `${month + 1}/${year}`,
        travelWith: travelStyle,
        tip: tip.trim(),
        shareToCommunity,
      },
      {
        onSuccess: () => {
          router.replace('/(tabs)/home');
        },
        onError: (e) => {
          Alert.alert(t('importErrorTitle'), formatErrorMessage(e, t('importErrorGeneric')));
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('close')}</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{t('importTitle')}</Text>
          <Pressable
            onPress={onSubmit}
            disabled={quickImport.isPending}
            hitSlop={12}
            accessibilityRole="button"
            style={{ opacity: quickImport.isPending ? 0.5 : 1 }}
          >
            {quickImport.isPending ? (
              <ActivityIndicator size="small" color={colors.primarySolid} />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primarySolid }}>{t('importSave')}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{t('importWhere')}</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder={t('importWherePlaceholder')}
          placeholderTextColor={colors.inactive}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            marginBottom: 4,
          }}
        />
        {flag && detectedCountry ? (
          <Text style={{ fontSize: 13, color: colors.primarySolid, marginBottom: 12 }}>
            {flag} {detectedCountry.name}
          </Text>
        ) : (
          <View style={{ marginBottom: 12 }} />
        )}

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{t('importWhen')}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
            {MONTHS.map((m, i) => (
              <Pressable
                key={m}
                onPress={() => setMonth(i)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: month === i ? colors.primarySolid : '#F3F4F6',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: month === i ? '#fff' : colors.text }}>{m}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 16 }}>
          {yearOptions().map((y) => (
            <Pressable
              key={y}
              onPress={() => setYear(y)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: year === y ? colors.primarySolid : '#F3F4F6',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: year === y ? '#fff' : colors.text }}>{y}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{t('importWho')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {IMPORT_TRAVEL_STYLES.map((style) => {
            const sel = travelStyle === style;
            return (
              <Pressable
                key={style}
                onPress={() => setTravelStyle(style)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: sel ? '#FFF3EC' : '#F3F4F6',
                  borderWidth: sel ? 1 : 0,
                  borderColor: colors.primarySolid,
                }}
              >
                <Text style={{ fontSize: 16 }}>{TRAVEL_STYLE_EMOJI[style]}</Text>
                <Text style={{ fontSize: 14, fontWeight: sel ? '700' : '500', color: colors.text }}>
                  {t(`importTravelStyle_${style}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{t('importTip')}</Text>
        <TextInput
          value={tip}
          onChangeText={(v) => setTip(v.slice(0, 280))}
          placeholder={t('importTipPlaceholder')}
          placeholderTextColor={colors.inactive}
          multiline
          maxLength={280}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 4,
          }}
        />
        <Text style={{ fontSize: 11, color: colors.inactive, textAlign: 'right', marginBottom: 16 }}>{tip.length}/280</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{t('importShareToggle')}</Text>
            <Text style={{ fontSize: 12, color: colors.inactive }}>{t('importShareHint')}</Text>
          </View>
          <Switch value={shareToCommunity} onValueChange={setShareToCommunity} trackColor={{ true: colors.primarySolid }} />
        </View>

        {isExplorer ? (
          <Pressable
            onPress={() => router.push('/trip/import-full')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 16,
              borderRadius: 14,
              backgroundColor: '#F0F4FF',
              borderWidth: 1,
              borderColor: '#C7D2FE',
            }}
          >
            <Text style={{ fontSize: 22 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#3730A3' }}>{t('importFullCta')}</Text>
              <Text style={{ fontSize: 12, color: '#6366F1' }}>{t('importFullSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6366F1" />
          </Pressable>
        ) : null}

        {!canImport ? (
          <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2' }}>
            <Text style={{ fontSize: 13, color: '#DC2626', textAlign: 'center' }}>{t('importRateLimit')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
