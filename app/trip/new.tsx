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
import { useCreateTrip } from '../../lib/hooks/useTrips';
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('trips:newTitle')}</Text>
          <View style={{ width: 48 }} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
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
        <Pressable onPress={() => setShowStart(true)} style={styles.dateBtn}>
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
        {Platform.OS === 'ios' && showStart ? (
          <Pressable onPress={() => setShowStart(false)} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common:save')}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>{t('trips:fieldEndDate')}</Text>
        <Pressable onPress={() => setShowEnd(true)} style={styles.dateBtn}>
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
        {Platform.OS === 'ios' && showEnd ? (
          <Pressable onPress={() => setShowEnd(false)} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common:save')}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={createTrip.isPending}
          style={({ pressed }) => ({
            marginTop: 24,
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            opacity: createTrip.isPending ? 0.7 : pressed ? 0.9 : 1,
          })}
        >
          {createTrip.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{t('trips:submitCreate')}</Text>
          )}
        </Pressable>
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
