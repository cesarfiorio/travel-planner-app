import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../constants/colors';
import type { VisitedCountryRow } from '../lib/hooks/useVisitedCountries';
import { countryFlag, getCountry } from '../lib/utils/countryUtils';
import { Button } from './ui';

type CountryCardProps = {
  visible: boolean;
  countryCode: string | null;
  visited: VisitedCountryRow | null;
  onClose: () => void;
  onAddManual: (code: string) => void;
  onRemove: (code: string) => void;
};

export function CountryCard({
  visible,
  countryCode,
  visited,
  onClose,
  onAddManual,
  onRemove,
}: CountryCardProps) {
  const { t } = useTranslation('map');
  const country = countryCode ? getCountry(countryCode) : undefined;

  if (!countryCode || !country) {
    return null;
  }

  const flag = countryFlag(countryCode);
  const visitDate = visited?.first_visit_date
    ? new Date(visited.first_visit_date).toLocaleDateString()
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.card}>
        <Pressable
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          hitSlop={12}
        >
          <Text style={styles.closeTxt}>✕</Text>
        </Pressable>

        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.name}>{country.name}</Text>
        <Text style={styles.continent}>{country.continent}</Text>

        {visited && (
          <View style={styles.info}>
            {visitDate && (
              <Text style={styles.detail}>
                {t('firstVisited', { date: visitDate })}
              </Text>
            )}
            <Text style={styles.detail}>
              {t('trip')}: {visited.is_manual ? t('manual') : visited.trip_id ?? t('manual')}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {visited ? (
            visited.is_manual && (
              <Button
                label={t('remove')}
                variant="destructive"
                fullWidth
                onPress={() => onRemove(countryCode)}
              />
            )
          ) : (
            <Button
              label={t('markVisited')}
              variant="primary"
              fullWidth
              onPress={() => onAddManual(countryCode)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  closeTxt: {
    fontSize: 18,
    color: colors.inactive,
  },
  flag: {
    fontSize: 48,
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  continent: {
    fontSize: 14,
    color: colors.inactive,
    marginBottom: 16,
  },
  info: {
    alignSelf: 'stretch',
    gap: 4,
    marginBottom: 20,
  },
  detail: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
  },
});
