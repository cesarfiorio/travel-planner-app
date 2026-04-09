import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep links and old routes still use `/memory`; the recap UI lives on `/finish`. */
export default function TripMemoryRedirect() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!tripId) {
    return null;
  }
  return <Redirect href={`/trip/${tripId}/finish`} />;
}
