import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../../constants/colors';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useAddExpense } from '../../../lib/hooks/useExpenses';
import type { MemberProfileBrief } from '../../../lib/hooks/useTrips';
import { useTrip } from '../../../lib/hooks/useTrips';
import {
  calculateEqualSplits,
  toCents,
  validateCustomSplitsSum,
} from '../../../lib/utils/splitCalculator';

type Category = 'food' | 'transport' | 'stay' | 'activity' | 'other';

const CATEGORIES: Category[] = ['food', 'transport', 'stay', 'activity', 'other'];

const CATEGORY_I18N: Record<Category, 'categoryFood' | 'categoryTransport' | 'categoryStay' | 'categoryActivity' | 'categoryOther'> = {
  food: 'categoryFood',
  transport: 'categoryTransport',
  stay: 'categoryStay',
  activity: 'categoryActivity',
  other: 'categoryOther',
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdToDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('expenses');
  const { user } = useAuth();
  const { data: trip, isLoading: tripLoading } = useTrip(tripId || undefined);
  const addExpense = useAddExpense();

  const memberIds = useMemo(() => {
    if (!trip) {
      return [];
    }
    const ids = new Set<string>();
    ids.add(trip.created_by);
    for (const m of trip.trip_members ?? []) {
      ids.add(m.user_id);
    }
    return [...ids];
  }, [trip]);

  const profileById = useMemo(() => {
    const m = new Map<string, MemberProfileBrief>();
    if (!trip) {
      return m;
    }
    for (const p of trip.memberProfiles ?? []) {
      m.set(p.id, p);
    }
    return m;
  }, [trip]);

  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [expenseDate, setExpenseDate] = useState(todayYmd());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidByUserId, setPaidByUserId] = useState(user?.id ?? '');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customByUser, setCustomByUser] = useState<Record<string, string>>({});

  const currency = 'EUR';

  useEffect(() => {
    if (!trip || !user?.id) {
      return;
    }
    const ids = new Set(memberIds);
    if (ids.has(user.id)) {
      setPaidByUserId(user.id);
    } else if (memberIds[0]) {
      setPaidByUserId(memberIds[0]);
    }
  }, [trip?.id, user?.id, memberIds.join('|')]);

  const displayName = (uid: string) => {
    const p = profileById.get(uid);
    return p?.display_name?.trim() || p?.full_name?.trim() || t('memberFallback');
  };

  const onSubmit = async () => {
    if (!tripId || !user?.id) {
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert(t('errorTitleRequired'));
      return;
    }
    const parsed = parseFloat(amountText.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert(t('errorAmountInvalid'));
      return;
    }
    const totalCents = toCents(parsed);

    let splits: { user_id: string; amount_owed_cents: number }[];
    if (splitMode === 'equal') {
      const map = calculateEqualSplits(totalCents, memberIds);
      splits = memberIds.map((uid) => ({ user_id: uid, amount_owed_cents: map[uid] ?? 0 }));
    } else {
      const centsMap: Record<string, number> = {};
      for (const uid of memberIds) {
        const raw = customByUser[uid]?.trim() ?? '';
        const n = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) {
          Alert.alert(t('errorAmountInvalid'));
          return;
        }
        centsMap[uid] = toCents(n);
      }
      if (!validateCustomSplitsSum(totalCents, centsMap)) {
        Alert.alert(t('errorSplitSum'));
        return;
      }
      splits = memberIds.map((uid) => ({ user_id: uid, amount_owed_cents: centsMap[uid] ?? 0 }));
    }

    const splitSum = splits.reduce((acc, s) => acc + s.amount_owed_cents, 0);
    if (splitSum !== totalCents) {
      Alert.alert(t('errorSplitSum'));
      return;
    }

    try {
      await addExpense.mutateAsync({
        tripId,
        title: trimmed,
        amountCents: totalCents,
        currency,
        category,
        expenseDate,
        paidByUserId: paidByUserId || user.id,
        splits,
      });
      router.back();
    } catch {
      Alert.alert(t('errorSave'));
    }
  };

  if (tripLoading || !trip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primarySolid} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 28 }}>
          {t('addTitle')}
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{t('fieldTitle')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('fieldTitlePlaceholder')}
          placeholderTextColor={colors.inactive}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            marginBottom: 16,
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{t('fieldAmount')}</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.inactive}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            marginBottom: 8,
          }}
        />
        <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 16 }}>{currency}</Text>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{t('fieldCategory')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: selected ? '#FFF3EC' : '#F3F4F6',
                  borderWidth: selected ? 1 : 0,
                  borderColor: colors.primarySolid,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '500', color: colors.text }}>
                  {t(CATEGORY_I18N[c])}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 6 }}>{t('fieldDate')}</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>{expenseDate}</Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={ymdToDate(expenseDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(ev, date) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
              if (ev.type === 'dismissed') {
                setShowDatePicker(false);
                return;
              }
              if (date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                setExpenseDate(`${y}-${m}-${d}`);
              }
            }}
          />
        ) : null}

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{t('fieldPaidBy')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {memberIds.map((uid) => {
            const selected = paidByUserId === uid;
            return (
              <Pressable
                key={uid}
                onPress={() => setPaidByUserId(uid)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: selected ? '#FFF3EC' : '#F3F4F6',
                  borderWidth: selected ? 1 : 0,
                  borderColor: colors.primarySolid,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '500', color: colors.text }}>
                  {displayName(uid)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inactive, marginBottom: 8 }}>{t('fieldSplit')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Pressable
            onPress={() => setSplitMode('equal')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: splitMode === 'equal' ? colors.primarySolid : '#F3F4F6',
            }}
          >
            <Text style={{ fontWeight: '700', color: splitMode === 'equal' ? colors.onPrimary : colors.text }}>
              {t('splitEqual')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSplitMode('custom')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: splitMode === 'custom' ? colors.primarySolid : '#F3F4F6',
            }}
          >
            <Text style={{ fontWeight: '700', color: splitMode === 'custom' ? colors.onPrimary : colors.text }}>
              {t('splitCustom')}
            </Text>
          </Pressable>
        </View>

        {splitMode === 'custom' ? (
          <>
            <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 8 }}>{t('customSplitHint')}</Text>
            {memberIds.map((uid) => (
              <View key={uid} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: colors.inactive, marginBottom: 4 }}>{displayName(uid)}</Text>
                <TextInput
                  value={customByUser[uid] ?? ''}
                  onChangeText={(v) => setCustomByUser((prev) => ({ ...prev, [uid]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.inactive}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 16,
                    color: colors.text,
                  }}
                />
              </View>
            ))}
          </>
        ) : null}

        <Pressable
          onPress={() => void onSubmit()}
          disabled={addExpense.isPending}
          style={{
            marginTop: 24,
            paddingVertical: 16,
            borderRadius: 14,
            backgroundColor: colors.primarySolid,
            alignItems: 'center',
            opacity: addExpense.isPending ? 0.7 : 1,
          }}
        >
          {addExpense.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.onPrimary }}>{t('save')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
