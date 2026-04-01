import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/colors';
import { SUPPORTED_CURRENCIES, getCurrency } from '../constants/currencies';

type CurrencyPickerProps = {
  value: string;
  onChange: (code: string) => void;
};

export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const { t } = useTranslation('expenses');
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = getCurrency(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return SUPPORTED_CURRENCIES;
    }
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.includes(q),
    );
  }, [query]);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 16,
        }}
        accessibilityRole="button"
        accessibilityLabel={t('selectCurrency')}
      >
        <Text style={{ fontSize: 18 }}>{selected.flag}</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{selected.code}</Text>
        <Text style={{ fontSize: 14, color: colors.inactive, flex: 1 }}>{selected.name}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.inactive} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 }}>
            <Pressable onPress={() => { setOpen(false); setQuery(''); }} hitSlop={12}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 26 }}>
              {t('selectCurrency')}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 12, marginBottom: 4 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('searchCurrencies')}
              placeholderTextColor={colors.inactive}
              autoCapitalize="none"
              autoCorrect={false}
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

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => {
              const isSelected = item.code === value;
              return (
                <Pressable
                  onPress={() => pick(item.code)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: pressed ? '#F3F4F6' : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                      {item.code} <Text style={{ fontWeight: '400', color: colors.inactive }}>({item.symbol})</Text>
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.inactive }}>{item.name}</Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primarySolid} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}
