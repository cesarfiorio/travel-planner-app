import { hasSupabaseEnv, supabase } from '../supabase';

/** Uploads a local image to the public `avatars` bucket; path is `{userId}/{file}`. */
export async function uploadProfileAvatar(localUri: string, userId: string): Promise<string | null> {
  if (!supabase || !hasSupabaseEnv || !localUri?.trim() || !userId) {
    return null;
  }
  const ext = localUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const res = await fetch(localUri);
  const buf = await res.arrayBuffer();
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const { error } = await supabase.storage.from('avatars').upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
