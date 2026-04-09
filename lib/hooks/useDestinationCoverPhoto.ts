import { useQuery } from '@tanstack/react-query';

import { destinationCoverPhotoQueryKey, fetchDestinationCoverUrl } from '../community/destinationCoverPhoto';

/**
 * Cached hero image URL for a destination label (e.g. "São Paulo, Brazil").
 * Skips when `enabled` is false (e.g. route already has cover_photo_url).
 */
export function useDestinationCoverPhoto(destinationLabel: string, enabled: boolean) {
  const q = destinationLabel.trim();
  return useQuery({
    queryKey: destinationCoverPhotoQueryKey(q),
    queryFn: () => fetchDestinationCoverUrl(q),
    enabled: enabled && q.length >= 2,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 14 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
