import { supabase } from './supabase';

const BUCKET = 'photos';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Convert a base64 data URI to a Blob with strict MIME & size validation.
 */
function base64ToBlob(dataUri: string): { blob: Blob; mime: string; ext: string } {
  const [header, base64Data] = dataUri.split(',');
  const mimeMatch = header?.match(/^data:(image\/(?:jpeg|png|webp));base64$/);
  if (!mimeMatch || !base64Data) {
    throw new Error('Unsupported or malformed image data URI. Only JPG, PNG, and WebP are allowed.');
  }
  const mime = mimeMatch[1];
  const ext = ALLOWED_MIMES[mime];
  const binary = atob(base64Data);
  if (binary.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image exceeds maximum allowed size of 5 MB.');
  }
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return { blob: new Blob([array], { type: mime }), mime, ext };
}

/**
 * Upload a base64 photo to Supabase Storage with cryptographic random filename.
 * Returns the storage path on success, null on failure.
 */
export async function uploadPhoto(base64DataUri: string, folder: string): Promise<string | null> {
  try {
    const { blob, mime, ext } = base64ToBlob(base64DataUri);
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
    const fileName = `${safeFolder}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, blob, {
        contentType: mime,
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
 * Get a time-limited signed URL for a private stored photo path.
 */
export async function getSignedPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Could not generate signed URL for:', path, error);
      return '';
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Failed to create signed URL:', err);
    return '';
  }
}

/**
 * Batch generate signed URLs for multiple photo paths.
 */
export async function getSignedPhotoUrls(paths: string[], expiresInSeconds = 3600): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!paths || paths.length === 0) return result;

  const pathsToSign: string[] = [];
  paths.forEach(p => {
    if (!p) return;
    if (p.startsWith('http') || p.startsWith('data:')) {
      result[p] = p;
    } else {
      pathsToSign.push(p);
    }
  });

  if (pathsToSign.length === 0) return result;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(pathsToSign, expiresInSeconds);

    if (!error && data) {
      data.forEach(item => {
        if (item.path && item.signedUrl) {
          result[item.path] = item.signedUrl;
        }
      });
    }
  } catch (err) {
    console.error('Failed to batch create signed URLs:', err);
  }

  return result;
}

/**
 * Synchronous fallback to get public URL (if bucket is public or for existing links).
 */
export function getPhotoUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a photo from storage by its path.
 */
export async function deletePhoto(path: string): Promise<boolean> {
  if (!path || path.startsWith('http') || path.startsWith('data:')) return false;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    console.error('Photo delete error:', error);
    return false;
  }
  return true;
}
