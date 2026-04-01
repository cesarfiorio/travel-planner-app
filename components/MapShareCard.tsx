import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { countryFlag } from '../lib/utils/countryUtils';
import { WorldMap } from './WorldMap';

type MapShareCardProps = {
  userName: string;
  visitedCodes: Set<string>;
  stats: { total: number; continents: number; percentage: number };
};

export type MapShareCardHandle = {
  capture: () => Promise<string>;
};

const MAX_FLAGS = 20;

export const MapShareCard = forwardRef<MapShareCardHandle, MapShareCardProps>(
  function MapShareCard({ userName, visitedCodes, stats }, ref) {
    const shotRef = useRef<ViewShot>(null);

    const capture = useCallback(async (): Promise<string> => {
      if (!shotRef.current?.capture) {
        throw new Error('ViewShot ref not ready');
      }
      return shotRef.current.capture();
    }, []);

    useImperativeHandle(ref, () => ({ capture }), [capture]);

    const codes = Array.from(visitedCodes);
    const visibleFlags = codes.slice(0, MAX_FLAGS);
    const overflow = codes.length - MAX_FLAGS;

    return (
      <ViewShot
        ref={shotRef}
        options={{ format: 'png', quality: 1, width: 1080, height: 1080 }}
        style={styles.container}
      >
        <Text style={styles.userName} numberOfLines={1}>
          {userName}
        </Text>

        <View style={styles.mapWrap}>
          <WorldMap
            visitedCodes={visitedCodes}
            width={320}
            height={160}
          />
        </View>

        <Text style={styles.statsLine}>
          {stats.total} countries · {stats.continents} continents · {stats.percentage}% of the world
        </Text>

        <View style={styles.flagsRow}>
          {visibleFlags.map((code) => (
            <Text key={code} style={styles.flagEmoji}>
              {countryFlag(code)}
            </Text>
          ))}
          {overflow > 0 && (
            <Text style={styles.overflow}>+{overflow}</Text>
          )}
        </View>

        <Text style={styles.footer}>routeflow.app</Text>
      </ViewShot>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: 360,
    height: 360,
    backgroundColor: '#1B2838',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  mapWrap: {
    marginBottom: 10,
  },
  statsLine: {
    color: '#FFFFFF',
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'center',
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  flagEmoji: {
    fontSize: 16,
  },
  overflow: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 'auto' as unknown as number,
  },
});
