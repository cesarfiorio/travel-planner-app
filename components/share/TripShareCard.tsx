import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

export type TripShareCardHandle = { capture: () => Promise<string | undefined> };

type TripShareCardProps = {
  destination: string;
  countryFlag?: string;
  countryName?: string;
  days: number;
  travelers: number;
  spentLabel: string;
  placesVisited: number;
  mood: string;
  moodEmoji: string;
  /** 'story' = 9:16 (360x640 → 1080x1920), 'square' = 1:1 (360x360 → 1080x1080) */
  format?: 'story' | 'square';
};

export const TripShareCard = forwardRef<TripShareCardHandle, TripShareCardProps>(
  ({ destination, countryFlag, countryName, days, travelers, spentLabel, placesVisited, mood, moodEmoji, format = 'story' }, ref) => {
    const shotRef = useRef<ViewShot>(null);
    useImperativeHandle(ref, () => ({
      capture: () => shotRef.current?.capture?.() ?? Promise.resolve(undefined),
    }));

    const isStory = format === 'story';
    const w = 360;
    const h = isStory ? 640 : 360;

    return (
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1, width: isStory ? 1080 : 1080 }}>
        <View
          style={{
            width: w,
            height: h,
            backgroundColor: '#0A0A0F',
            padding: 24,
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#EA580C', fontSize: 14, fontWeight: '800', textAlign: 'center', letterSpacing: 2 }}>
            ROUTEFLOW
          </Text>

          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: isStory ? 48 : 36,
                fontWeight: '900',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 3,
                marginBottom: 8,
              }}
              numberOfLines={2}
            >
              {destination}
            </Text>
            {countryFlag || countryName ? (
              <Text style={{ color: '#94A3B8', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
                {countryFlag ? `${countryFlag} ` : ''}{countryName ?? ''}
              </Text>
            ) : null}

            <View style={{ width: 60, height: 2, backgroundColor: '#EA580C', borderRadius: 1, marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{days}</Text>
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>DAYS</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{travelers}</Text>
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>TRAVELERS</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{spentLabel}</Text>
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>TOTAL</Text>
              </View>
            </View>

            {isStory ? (
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  {placesVisited} places visited
                </Text>
                <View
                  style={{
                    marginTop: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: 'rgba(234,88,12,0.15)',
                  }}
                >
                  <Text style={{ color: '#F97316', fontSize: 15, fontWeight: '700' }}>
                    {moodEmoji} {mood}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center' }}>
            Plan your own trip → routeflow.app
          </Text>
        </View>
      </ViewShot>
    );
  },
);
