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
  const countryMarkers = useMemo(() => {
    return Object.entries(COUNTRY_CENTERS).map(([code, pos]) => ({
      code,
      ...pos,
      visited: visitedCodes.has(code),
    }));
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
      {countryMarkers.map(({ code, x, y, visited }) => (
        <G key={code} onPress={onCountryPress ? () => onCountryPress(code) : undefined}>
          {visited ? (
            <>
              <Circle cx={x} cy={y} r={6} fill="#EA580C" stroke="#F97316" strokeWidth={1.5} />
              <Circle cx={x} cy={y} r={2.5} fill="#FFFFFF" />
            </>
          ) : (
            <Circle cx={x} cy={y} r={5} fill="#3F3F46" stroke="#52525B" strokeWidth={0.8} />
          )}
        </G>
      ))}
    </Svg>
  );
}
