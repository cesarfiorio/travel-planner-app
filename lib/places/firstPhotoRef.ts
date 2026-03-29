export function firstPhotoReference(photos: unknown): string | undefined {
  if (!Array.isArray(photos) || photos.length === 0) {
    return undefined;
  }
  const x = photos[0];
  return typeof x === 'string' && x.length > 0 ? x : undefined;
}
