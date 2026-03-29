import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { ExploreCategoryFilter } from '../types/places';

type Props = {
  value: ExploreCategoryFilter;
  onChange: (next: ExploreCategoryFilter) => void;
};

const ORDER: ExploreCategoryFilter[] = [
  'all',
  'restaurants',
  'attractions',
  'outdoor',
  'nightlife',
  'shopping',
];

export function CategoryFilter({ value, onChange }: Props) {
  const { t } = useTranslation('explore');

  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}>
        {ORDER.map((key) => {
          const selected = value === key;
          const labelKey = `category_${key}` as const;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: selected ? colors.primarySolid : '#F3F4F6',
                borderWidth: 1,
                borderColor: selected ? colors.primarySolid : colors.border,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`categoryA11y_${key}`)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: selected ? '700' : '500',
                  color: selected ? colors.onPrimary : colors.text,
                }}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
