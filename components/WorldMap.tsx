import React, { useMemo } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { COUNTRY_CENTERS, WORLD_OUTLINE } from '../lib/map/countryPaths';

type WorldMapProps = {
  visitedCodes: Set<string>;
  onCountryPress?: (code: string) => void;
  width: number;
  height: number;
};

export function WorldMap({
  visitedCodes,
  onCountryPress,
  width,
  height,
}: WorldMapProps) {
  const visitedEntries = useMemo(() => {
    const entries: { code: string; x: number; y: number }[] = [];
    for (const [code, pos] of Object.entries(COUNTRY_CENTERS)) {
      if (visitedCodes.has(code)) {
        entries.push({ code, ...pos });
      }
    }
    return entries;
  }, [visitedCodes]);

  return (
    <Svg width={width} height={height} viewBox="0 0 1000 500">
      <Rect x={0} y={0} width={1000} height={500} fill="#1B2838" />
      <Path
        d={WORLD_OUTLINE}
        fill="#2A2A2A"
        stroke="#3A3A3A"
        strokeWidth={0.5}
      />
      {visitedEntries.map(({ code, x, y }) => (
        <G key={code} onPress={onCountryPress ? () => onCountryPress(code) : undefined}>
          <Circle cx={x} cy={y} r={6} fill="#EA580C" stroke="#F97316" strokeWidth={1.5} />
          <Circle cx={x} cy={y} r={2.5} fill="#FFFFFF" />
        </G>
      ))}
    </Svg>
  );
}
