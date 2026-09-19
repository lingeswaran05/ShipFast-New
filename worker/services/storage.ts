import { Env } from '../types';

export async function uploadToR2(
  env: Env,
  fileData: ArrayBuffer | Uint8Array,
  contentType: string,
  prefix = 'uploads'
): Promise<{ key: string; url: string }> {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('pdf') ? 'pdf' : contentType.includes('webp') ? 'webp' : 'jpg';
  const id = crypto.randomUUID();
  const key = `${prefix}/${id}.${ext}`;

  if (env.R2_BUCKET) {
    await env.R2_BUCKET.put(key, fileData, {
      httpMetadata: {
        contentType
      }
    });
    return {
      key,
      url: `/api/files/${encodeURIComponent(key)}`
    };
  }

  // Fallback for local emulation if R2 binding is not attached: Base64 data URI
  const bytes = new Uint8Array(fileData);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const dataUrl = `data:${contentType};base64,${base64}`;

  return {
    key,
    url: dataUrl
  };
}

export async function getFromR2(env: Env, key: string): Promise<{ data: ReadableStream | null; contentType: string } | null> {
  if (!env.R2_BUCKET) {
    return null;
  }

  const obj = await env.R2_BUCKET.get(key);
  if (!obj) {
    return null;
  }

  return {
    data: obj.body,
    contentType: obj.httpMetadata?.contentType || 'application/octet-stream'
  };
}
