import { Stack } from 'expo-router';

export default function TripStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="import" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="import-full" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="[id]/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="[id]/edit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="[id]/members" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="[id]/finish" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="[id]/memory" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="[id]/add-expense" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
