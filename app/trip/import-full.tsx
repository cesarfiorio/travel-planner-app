import DateTimePicker from '@react-native-community/datetimepicker';
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

import { CurrencyPicker } from '../../components/CurrencyPicker';
import { colors } from '../../constants/colors';
import { defaultCurrencyForLocale } from '../../constants/currencies';
import { formatErrorMessage } from '../../lib/formatError';
import { useCanImport, useFullImportTrip } from '../../lib/hooks/useImportTrip';
import type { MemoryMood } from '../../lib/hooks/useFinishTrip';

type TravelWith = 'solo' | 'partner' | 'friends' | 'family' | 'group';
const TRAVEL_WITH: TravelWith[] = ['solo', 'partner', 'friends', 'family', 'group'];
const MOODS: MemoryMood[] = ['amazing', 'great', 'good', 'mixed'];
const MOOD_EMOJI: Record<MemoryMood, string> = { amazing: '😍', great: '🤩', good: '😊', mixed: '🤔' };

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ImportFullScreen() {
  const { t, i18n } = useTranslation('trips');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canImport = useCanImport();
  const fullImport = useFullImportTrip();

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = stripTime(new Date());
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState(() => stripTime(new Date()));
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [travelWith, setTravelWith] = useState<TravelWith>('friends');
  const [tip, setTip] = useState('');
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [mood, setMood] = useState<MemoryMood>('great');
  const [spentText, setSpentText] = useState('');
  const [currency, setCurrency] = useState<string>(() => defaultCurrencyForLocale(i18n.language));

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
    const spent = parseFloat(spentText.replace(',', '.'));
    const totalCents = Number.isFinite(spent) && spent > 0 ? Math.round(spent * 100) : 0;

    fullImport.mutate(
      {
        destination: trimDest,
        monthYear: `${startDate.getMonth() + 1}/${startDate.getFullYear()}`,
        travelWith,
        tip: tip.trim(),
        shareToCommunity,
        startDate: toYmd(startDate),
        endDate: toYmd(endDate),
        placeIds: [],
        totalSpentCents: totalCents,
        currency,
        mood,
      },
      {
        onSuccess: () => router.replace('/(tabs)/home'),
        onError: (e) => Alert.alert(t('importErrorTitle'), formatErrorMessage(e, t('importErrorGeneric'))),
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{t('importFullTitle')}</Text>
          <Pressable
            onPress={onSubmit}
            disabled={fullImport.isPending}
            hitSlop={12}
            accessibilityRole="button"
            style={{ opacity: fullImport.isPending ? 0.5 : 1 }}
          >
            {fullImport.isPending ? (
              <ActivityIndicator size="small" color={colors.primarySolid} />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primarySolid }}>{t('importSave')}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Text style={lbl}>{t('importWhere')}</Text>
        <TextInput value={destination} onChangeText={setDestination} placeholder={t('importWherePlaceholder')} placeholderTextColor={colors.inactive} style={inp} />

        <Text style={lbl}>{t('fieldStartDate')}</Text>
        <Pressable onPress={() => setShowStart(true)} style={dateBtn}>
          <Text style={{ fontSize: 16, color: colors.text }}>{toYmd(startDate)}</Text>
        </Pressable>
        {showStart ? (
          <DateTimePicker value={startDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { if (Platform.OS !== 'ios') setShowStart(false); if (d) setStartDate(stripTime(d)); }} />
        ) : null}

        <Text style={lbl}>{t('fieldEndDate')}</Text>
        <Pressable onPress={() => setShowEnd(true)} style={dateBtn}>
          <Text style={{ fontSize: 16, color: colors.text }}>{toYmd(endDate)}</Text>
        </Pressable>
        {showEnd ? (
          <DateTimePicker value={endDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={startDate} onChange={(_, d) => { if (Platform.OS !== 'ios') setShowEnd(false); if (d) setEndDate(stripTime(d)); }} />
        ) : null}

        <Text style={lbl}>{t('importWho')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TRAVEL_WITH.map((tw) => {
            const sel = travelWith === tw;
            return (
              <Pressable key={tw} onPress={() => setTravelWith(tw)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: sel ? '#FFF3EC' : '#F3F4F6', borderWidth: sel ? 1 : 0, borderColor: colors.primarySolid }}>
                <Text style={{ fontSize: 14, fontWeight: sel ? '700' : '500', color: colors.text }}>{t(`importWith_${tw}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={lbl}>{t('importMood')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {MOODS.map((m) => {
            const sel = mood === m;
            return (
              <Pressable key={m} onPress={() => setMood(m)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: sel ? '#FFF3EC' : '#F3F4F6', borderWidth: sel ? 1 : 0, borderColor: colors.primarySolid, alignItems: 'center' }}>
                <Text style={{ fontSize: 22 }}>{MOOD_EMOJI[m]}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 2 }}>{t(`importMood_${m}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={lbl}>{t('importSpent')}</Text>
        <TextInput value={spentText} onChangeText={setSpentText} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={colors.inactive} style={inp} />
        <CurrencyPicker value={currency} onChange={setCurrency} />

        <Text style={lbl}>{t('importTip')}</Text>
        <TextInput value={tip} onChangeText={(v) => setTip(v.slice(0, 280))} placeholder={t('importTipPlaceholder')} placeholderTextColor={colors.inactive} multiline maxLength={280} style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{t('importShareToggle')}</Text>
          </View>
          <Switch value={shareToCommunity} onValueChange={setShareToCommunity} trackColor={{ true: colors.primarySolid }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const lbl = { fontSize: 13 as const, fontWeight: '600' as const, color: colors.inactive, marginBottom: 6, marginTop: 12 };
const inp = { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 as const, color: colors.text, marginBottom: 16 };
const dateBtn = { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16 };
