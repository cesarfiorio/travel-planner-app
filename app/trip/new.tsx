import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../lib/formatError';
import { useAuth } from '../../lib/hooks/useAuth';
import { FREE_OWNER_TRIP_LIMIT, useSubscription } from '../../lib/hooks/useSubscription';
import { useCreateTrip, useMyTrips } from '../../lib/hooks/useTrips';
import { tripRowToSnapshot, useAppStore } from '../../lib/store/appStore';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function NewTripScreen() {
  const { t, i18n } = useTranslation(['trips', 'common']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: trips = [] } = useMyTrips();
  const { isExplorer } = useSubscription();
  const createTrip = useCreateTrip();
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(() => stripTime(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = stripTime(new Date());
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const openStartPicker = () => {
    setShowEnd(false);
    setShowStart(true);
  };
  const openEndPicker = () => {
    setShowStart(false);
    setShowEnd(true);
  };

  const locale =
    i18n.language.split('-')[0] === 'pt'
      ? 'pt-BR'
      : i18n.language.split('-')[0] === 'en'
        ? 'en-US'
        : i18n.language;

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('common:somethingWentWrong'), t('trips:errorNameRequired'));
      return;
    }
    const owned = trips.filter((tr) => tr.created_by === userId).length;
    if (!isExplorer && owned >= FREE_OWNER_TRIP_LIMIT) {
      Alert.alert(t('trips:tripLimitTitle'), t('trips:tripLimitMessage'), [
        { text: t('common:cancel'), style: 'cancel' },
        { text: t('trips:tripLimitUpgrade'), onPress: () => router.push('/(stack)/paywall') },
      ]);
      return;
    }
    const start = stripTime(startDate);
    const end = stripTime(endDate);
    if (end.getTime() < start.getTime()) {
      Alert.alert(t('common:somethingWentWrong'), t('trips:errorEndBeforeStart'));
      return;
    }

    void createTrip.mutate(
      {
        name: trimmedName,
        destination_label: destination.trim() || null,
        start_date: toYmd(start),
        end_date: toYmd(end),
      },
      {
        onSuccess: (row) => {
          setActiveTrip(tripRowToSnapshot(row));
          router.replace('/(tabs)');
        },
        onError: (e) => {
          Alert.alert(t('common:somethingWentWrong'), formatErrorMessage(e, t('trips:errorCreateFailed')));
        },
      },
    );
  };

  const iosPickerOpen = Platform.OS === 'ios' && (showStart || showEnd);
  const scrollBottomPad =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 12) + (iosPickerOpen ? 58 : 96)
      : 40;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('trips:closeA11y')}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('trips:close')}</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{t('trips:newTitle')}</Text>
          <View style={{ width: 48 }} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: scrollBottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{t('trips:fieldTripName')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('trips:fieldTripNamePlaceholder')}
          placeholderTextColor={colors.inactive}
          style={styles.input}
        />
        <Text style={styles.label}>{t('trips:fieldDestination')}</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder={t('trips:fieldDestinationPlaceholder')}
          placeholderTextColor={colors.inactive}
          style={styles.input}
        />
        <Text style={styles.label}>{t('trips:fieldStartDate')}</Text>
        <Pressable onPress={openStartPicker} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{startDate.toLocaleDateString(locale)}</Text>
        </Pressable>
        {showStart ? (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') {
                setShowStart(false);
              }
              if (d) {
                setStartDate(stripTime(d));
              }
            }}
          />
        ) : null}

        <Text style={styles.label}>{t('trips:fieldEndDate')}</Text>
        <Pressable onPress={openEndPicker} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{endDate.toLocaleDateString(locale)}</Text>
        </Pressable>
        {showEnd ? (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={startDate}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') {
                setShowEnd(false);
              }
              if (d) {
                setEndDate(stripTime(d));
              }
            }}
          />
        ) : null}

        {Platform.OS === 'android' ? (
          <Pressable
            onPress={submit}
            disabled={createTrip.isPending}
            style={({ pressed }) => ({
              marginTop: 24,
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: '#EA580C',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#C2410C',
              opacity: createTrip.isPending ? 0.7 : pressed ? 0.92 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
              elevation: 4,
            })}
          >
            {createTrip.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>{t('trips:createNewTripBanner')}</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: iosPickerOpen ? 8 : 12,
            paddingBottom: Math.max(insets.bottom, 12) + 10,
            backgroundColor: colors.background,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 10,
          }}
        >
          {iosPickerOpen ? (
            <Pressable
              onPress={() => {
                setShowStart(false);
                setShowEnd(false);
              }}
              style={({ pressed }) => ({
                alignSelf: 'center',
                paddingVertical: 16,
                paddingHorizontal: 32,
                opacity: pressed ? 0.75 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={t('common:save')}
            >
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>{t('common:save')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={submit}
              disabled={createTrip.isPending}
              style={({ pressed }) => ({
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: '#EA580C',
                borderWidth: 2,
                borderColor: '#C2410C',
                alignItems: 'center',
                opacity: createTrip.isPending ? 0.7 : pressed ? 0.9 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={t('trips:createNewTripBanner')}
            >
              {createTrip.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
                  {t('trips:createNewTripBanner')}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inactive,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateBtnText: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '500',
  },
});
