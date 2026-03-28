import { Stack } from 'expo-router';

export default function TripStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="[id]/index" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
