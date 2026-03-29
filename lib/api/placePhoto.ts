const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

export function getPlacePhotoSource(
  photoReference: string | undefined,
  accessToken: string | null | undefined,
): { uri: string; headers: Record<string, string> } | null {
  if (!supabaseUrl?.trim() || !photoReference?.trim() || !accessToken?.trim()) {
    return null;
  }
  return {
    uri: `${supabaseUrl.replace(/\/$/, '')}/functions/v1/place-photo?photo_reference=${encodeURIComponent(photoReference.trim())}`,
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  };
}
