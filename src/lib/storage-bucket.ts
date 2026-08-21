import { supabase } from './supabase';

const BUCKET = 'photos';

/**
 * Convert a base64 data URI to a Blob for upload.
 */
function base64ToBlob(dataUri: string): Blob {
  const [header, base64Data] = dataUri.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Upload a base64 photo to Supabase Storage.
 * Returns the storage path on success, null on failure.
 */
export async function uploadPhoto(base64DataUri: string, folder: string): Promise<string | null> {
  try {
    const blob = base64ToBlob(base64DataUri);
    const ext = base64DataUri.includes('image/png') ? 'png' : 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, blob, {
        contentType: `image/${ext}`,
        upsert: false,
      });

    if (error) {
      console.error('Photo upload error:', error);
      return null;
    }

    return fileName;
  } catch (err) {
    console.error('Photo upload exception:', err);
    return null;
  }
}

/**
 * Get the public URL for a stored photo path.
 * Works because the bucket is set to public.
 */
export function getPhotoUrl(path: string): string {
  if (!path) return '';
  // If it's already a full URL, return as-is
  if (path.startsWith('http')) return path;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a photo from storage by its path.
 */
export async function deletePhoto(path: string): Promise<boolean> {
  if (!path || path.startsWith('http')) return false;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    console.error('Photo delete error:', error);
    return false;
  }
  return true;
}
