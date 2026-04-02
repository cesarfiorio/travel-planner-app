import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

export type RouteShareCardHandle = { capture: () => Promise<string | undefined> };

type RouteShareCardProps = {
  destination: string;
  likesCount: number;
  topPlaces: string[];
  travelStyle?: string;
  shareToken?: string;
};

export const RouteShareCard = forwardRef<RouteShareCardHandle, RouteShareCardProps>(
  ({ destination, likesCount, topPlaces, travelStyle, shareToken }, ref) => {
    const shotRef = useRef<ViewShot>(null);
    useImperativeHandle(ref, () => ({
      capture: () => shotRef.current?.capture?.() ?? Promise.resolve(undefined),
    }));

    return (
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1, width: 1080 }}>
        <View
          style={{
            width: 360,
            height: 360,
            backgroundColor: '#0A0A0F',
            padding: 28,
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ color: '#EA580C', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 8 }}>
              ROUTEFLOW
            </Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              MY {destination} ROUTE
            </Text>
            {travelStyle ? (
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 12 }}>
                {travelStyle}
              </Text>
            ) : null}
          </View>

          <View>
            {likesCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ color: '#F97316', fontSize: 24, fontWeight: '900', marginRight: 8 }}>{likesCount}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>people loved this route</Text>
              </View>
            ) : null}

            {topPlaces.slice(0, 3).map((name, i) => (
              <Text key={`${i}-${name}`} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 6 }}>
                {i + 1}. {name}
              </Text>
            ))}
          </View>

          <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center' }}>
            {shareToken ? `routeflow.app/route/${shareToken}` : 'routeflow.app'}
          </Text>
        </View>
      </ViewShot>
    );
  },
);
