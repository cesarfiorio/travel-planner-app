import { hasSupabaseEnv, supabase } from '../supabase';

/**
 * Uploads a local image URI to the public memory-covers bucket.
 * Returns public URL or null.
 */
export async function uploadMemoryCover(localUri: string, userId: string): Promise<string | null> {
  if (!supabase || !hasSupabaseEnv || !localUri?.trim() || !userId) {
    return null;
  }
  const ext = localUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const res = await fetch(localUri);
  const buf = await res.arrayBuffer();
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const { error } = await supabase.storage.from('memory-covers').upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from('memory-covers').getPublicUrl(path);
  return data.publicUrl;
}
