import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountryCard } from '../../components/CountryCard';
import { MapShareCard, type MapShareCardHandle } from '../../components/MapShareCard';
import { PlanGate } from '../../components/PlanGate';
import { WorldMap } from '../../components/WorldMap';
import { colors } from '../../constants/colors';
import { useAuth } from '../../lib/hooks/useAuth';
import { useProfile } from '../../lib/hooks/useProfile';
import { FREE_MAP_COUNTRY_LIMIT } from '../../lib/hooks/useVisitedCountries';
import {
  useAddVisitedCountry,
  useRemoveVisitedCountry,
  useVisitedCountries,
  type VisitedCountryRow,
} from '../../lib/hooks/useVisitedCountries';
import { useSubscription } from '../../lib/hooks/useSubscription';
import { continentStats, countryFlag, getCountry, TOTAL_COUNTRIES } from '../../lib/utils/countryUtils';

export default function MapScreen() {
  const { t } = useTranslation('map');
  const { t: ts } = useTranslation('share');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isExplorer } = useSubscription();
  const { data: rows = [], isLoading } = useVisitedCountries();
  const addCountry = useAddVisitedCountry();
  const removeCountry = useRemoveVisitedCountry();
  const shareRef = useRef<MapShareCardHandle>(null);
  const [sharing, setSharing] = useState(false);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const visitedCodes = useMemo(() => new Set(rows.map((r) => r.country_code)), [rows]);
  const stats = useMemo(() => continentStats([...visitedCodes]), [visitedCodes]);

  const selectedRow: VisitedCountryRow | null = useMemo(() => {
    if (!selectedCode) {
      return null;
    }
    return rows.find((r) => r.country_code === selectedCode) ?? null;
  }, [selectedCode, rows]);

  const atLimit = !isExplorer && visitedCodes.size >= FREE_MAP_COUNTRY_LIMIT;

  const handleCountryPress = useCallback((code: string) => {
    setSelectedCode(code);
  }, []);

  const handleAddManual = useCallback(
    (code: string) => {
      if (atLimit) {
        Alert.alert(t('limitTitle'), t('limitBody'));
        return;
      }
      const c = getCountry(code);
      if (!c) {
        return;
      }
      addCountry.mutate(
        { countryCode: code, countryName: c.name, isManual: true },
        { onSuccess: () => setSelectedCode(null) },
      );
    },
    [addCountry, atLimit, t],
  );

  const handleRemove = useCallback(
    (code: string) => {
      removeCountry.mutate(code, { onSuccess: () => setSelectedCode(null) });
    },
    [removeCountry],
  );

  const handleShare = async () => {
    setSharing(true);
    try {
      const uri = await shareRef.current?.capture();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
    } catch {
      Alert.alert(t('errorTitle'), t('errorShare'));
    } finally {
      setSharing(false);
    }
  };

  const userName =
    profile?.full_name?.trim() || profile?.display_name?.trim() || t('traveler');

  return (
    <View style={{ flex: 1, backgroundColor: '#1B2838', paddingTop: insets.top + 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>{t('title')}</Text>
        <PlanGate requires="explorer" fallback={null}>
          <Pressable
            onPress={() => void handleShare()}
            disabled={sharing}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.12)',
              opacity: pressed ? 0.8 : sharing ? 0.5 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={t('share')}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{t('share')}</Text>
              </>
            )}
          </Pressable>
        </PlanGate>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primarySolid} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
            <WorldMap
              visitedCodes={visitedCodes}
              onCountryPress={handleCountryPress}
              width={380}
              height={200}
            />
          </View>

          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF' }}>{stats.total}</Text>
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>{t('statCountries')}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF' }}>{stats.continents}</Text>
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>{t('statContinents')}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF' }}>{stats.percentage}%</Text>
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>{t('statWorld')}</Text>
              </View>
            </View>

            {rows.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {rows.slice(0, 30).map((r) => (
                  <Pressable
                    key={r.country_code}
                    onPress={() => setSelectedCode(r.country_code)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#FFFFFF' }}>
                      {countryFlag(r.country_code)} {r.country_code}
                    </Text>
                  </Pressable>
                ))}
                {rows.length > 30 ? (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 14, color: '#94A3B8' }}>+{rows.length - 30}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: '#94A3B8', textAlign: 'center', fontSize: 15 }}>{t('emptyHint')}</Text>
            )}

            {atLimit ? (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(234,88,12,0.15)',
                }}
              >
                <Text style={{ fontSize: 13, color: '#F97316', textAlign: 'center' }}>{t('limitBanner')}</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      <CountryCard
        visible={selectedCode !== null}
        countryCode={selectedCode}
        visited={selectedRow}
        onClose={() => setSelectedCode(null)}
        onAddManual={handleAddManual}
        onRemove={handleRemove}
      />

      <View style={{ position: 'absolute', left: -9999 }}>
        <MapShareCard
          ref={shareRef}
          userName={userName}
          visitedCodes={visitedCodes}
          visitedCount={stats.total}
          continentCount={stats.continents}
          percentage={stats.percentage}
          labels={{
            countries: ts('countriesVisited'),
            continents: ts('continentsVisited'),
            tagline: ts('exploreWith'),
            ofTheWorld: ts('mapPercentOfWorld'),
          }}
          footerLine={ts('mapFooter')}
        />
      </View>
    </View>
  );
}
