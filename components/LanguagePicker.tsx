import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { colors } from '../constants/colors';
import { isAppLanguageCode, setAppLanguage, type AppLanguageCode } from '../lib/i18n';

function currentLanguageCode(i18nLanguage: string): AppLanguageCode {
  const base = i18nLanguage.split('-')[0] ?? 'en';
  return isAppLanguageCode(base) ? base : 'en';
}

export function LanguagePicker() {
  const { t, i18n } = useTranslation('common');
  const active = currentLanguageCode(i18n.language);

  return (
    <View style={{ marginTop: 8 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 10,
        }}
      >
        {t('language')}
      </Text>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const selected = lang.code === active;
        return (
          <Pressable
            key={lang.code}
            onPress={() => void setAppLanguage(lang.code as AppLanguageCode)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? '#FFF8F5' : 'transparent',
              marginBottom: 8,
              opacity: pressed ? 0.85 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={`${lang.nativeName}, ${lang.name}`}
            accessibilityState={{ selected }}
          >
            <Text style={{ fontSize: 22, marginRight: 12 }}>{lang.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{lang.nativeName}</Text>
              <Text style={{ fontSize: 13, color: colors.inactive }}>{lang.name}</Text>
            </View>
            {selected ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} importantForAccessibility="no" />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
