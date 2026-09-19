import { Hono } from 'hono';
import { Env } from '../types';
import { uploadToR2, getFromR2 } from '../services/storage';

const uploadRouter = new Hono<{ Bindings: Env }>();

// Upload Image / Document to Cloudflare R2
uploadRouter.post('/upload', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'] || body['image'];

      if (!file) {
        return c.json({ success: false, message: 'No file uploaded in form data' }, 400);
      }

      if (typeof file === 'string') {
        const buffer = new TextEncoder().encode(file);
        const result = await uploadToR2(c.env, buffer, 'text/plain');
        return c.json({ success: true, url: result.url, key: result.key });
      }

      // File object (Blob)
      const arrayBuffer = await (file as Blob).arrayBuffer();
      const mimeType = (file as Blob).type || 'image/jpeg';
      const result = await uploadToR2(c.env, arrayBuffer, mimeType);

      return c.json({
        success: true,
        message: 'File uploaded to Cloudflare R2 successfully',
        url: result.url,
        key: result.key
      });
    }

    // JSON base64 payload
    const json = await c.req.json();
    const base64Data = json.image || json.file || json.data;
    if (!base64Data) {
      return c.json({ success: false, message: 'Image base64 data required' }, 400);
    }

    const matches = String(base64Data).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let rawBase64 = base64Data;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      rawBase64 = matches[2];
    }

    const binaryStr = atob(rawBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const result = await uploadToR2(c.env, bytes.buffer, mimeType);
    return c.json({
      success: true,
      message: 'Image uploaded to Cloudflare R2 successfully',
      url: result.url,
      key: result.key
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to upload image' }, 500);
  }
});

// Retrieve Image / File from Cloudflare R2
uploadRouter.get('/files/:key{.+}', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const file = await getFromR2(c.env, key);

  if (!file || !file.data) {
    return c.text('File not found', 404);
  }

  return new Response(file.data, {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
});

export default uploadRouter;
