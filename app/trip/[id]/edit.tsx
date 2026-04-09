import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
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

import { CurrencyPicker } from '../../../components/CurrencyPicker';
import { colors } from '../../../constants/colors';
import { defaultCurrencyForLocale } from '../../../constants/currencies';
import { formatErrorMessage } from '../../../lib/formatError';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useTrip, useUpdateTrip } from '../../../lib/hooks/useTrips';
import { parseLocalDate } from '../../../lib/trips/tripUi';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function EditTripScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation(['trips', 'common']);
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const updateTrip = useUpdateTrip();

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(() => stripTime(new Date()));
  const [endDate, setEndDate] = useState(() => stripTime(new Date()));
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<string>(() => defaultCurrencyForLocale(i18n.language));

  useEffect(() => {
    if (!trip) {
      return;
    }
    setName(trip.name);
    setDestination(trip.destination_label ?? '');
    const s = parseLocalDate(trip.start_date) ?? stripTime(new Date());
    const e = parseLocalDate(trip.end_date) ?? stripTime(s);
    setStartDate(stripTime(s));
    setEndDate(stripTime(e));
    setDefaultCurrency(trip.default_currency || defaultCurrencyForLocale(i18n.language));
  }, [trip]);

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
    if (!tripId || !trip) {
      return;
    }
    if (!trimmedName) {
      Alert.alert(t('common:somethingWentWrong'), t('trips:errorNameRequired'));
      return;
    }
    const start = stripTime(startDate);
    const end = stripTime(endDate);
    if (end.getTime() < start.getTime()) {
      Alert.alert(t('common:somethingWentWrong'), t('trips:errorEndBeforeStart'));
      return;
    }

    void updateTrip.mutate(
      {
        id: tripId,
        name: trimmedName,
        destination_label: destination.trim() || null,
        start_date: toYmd(start),
        end_date: toYmd(end),
        default_currency: defaultCurrency,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (e) => {
          Alert.alert(t('common:somethingWentWrong'), formatErrorMessage(e, t('trips:errorUpdateFailed')));
        },
      },
    );
  };

  const scrollBottomPad = Math.max(insets.bottom, 12) + 24;

  if (isLoading && !trip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !trip) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('trips:close')}</Text>
        </Pressable>
        <Text style={{ marginTop: 24, fontSize: 17, color: colors.inactive }}>{t('trips:notFound')}</Text>
      </View>
    );
  }

  if (trip.created_by !== userId) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('trips:close')}</Text>
        </Pressable>
        <Text style={{ marginTop: 24, fontSize: 17, color: colors.inactive }}>{t('trips:errorNotOwner')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('trips:closeA11y')}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('trips:close')}</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{t('trips:editTripTitle')}</Text>
          <Pressable
            onPress={submit}
            disabled={updateTrip.isPending}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common:save')}
            style={{ opacity: updateTrip.isPending ? 0.5 : 1 }}
          >
            {updateTrip.isPending ? (
              <ActivityIndicator size="small" color={colors.primarySolid} />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primarySolid }}>{t('common:save')}</Text>
            )}
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: scrollBottomPad }} keyboardShouldPersistTaps="handled">
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

        <Text style={styles.label}>{t('trips:fieldCurrency')}</Text>
        <CurrencyPicker value={defaultCurrency} onChange={setDefaultCurrency} />
      </ScrollView>
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
