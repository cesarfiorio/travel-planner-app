import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { ExploreCategoryFilter } from '../types/places';

type Props = {
  value: ExploreCategoryFilter;
  onChange: (next: ExploreCategoryFilter) => void;
};

/** Order matches design: All, Restaurants, Attractions, Hotels, then the rest. */
const ORDER: ExploreCategoryFilter[] = [
  'all',
  'restaurants',
  'attractions',
  'accommodation',
  'outdoor',
  'nightlife',
  'shopping',
];

const ORANGE = '#F05A1A';

export function CategoryFilter({ value, onChange }: Props) {
  const { t } = useTranslation('explore');

  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        indicatorStyle="default"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}
      >
        {ORDER.map((key) => {
          const selected = value === key;
          const labelKey = `category_${key}` as const;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 24,
                backgroundColor: selected ? ORANGE : '#FFFFFF',
                borderWidth: 1,
                borderColor: selected ? ORANGE : '#E5E7EB',
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`categoryA11y_${key}`)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: selected ? '700' : '500',
                  color: selected ? '#FFFFFF' : '#374151',
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
