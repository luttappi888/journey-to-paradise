import { put } from '@vercel/blob';
import { authed, readBuffer } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!authed(req)) return res.status(401).json({ error: 'Not allowed' });
  const buf = await readBuffer(req);
  if (!buf.length || buf.length > 4 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image must be under 4 MB' });
  }
  const type = String(req.headers['content-type'] || 'image/jpeg');
  if (!type.startsWith('image/')) return res.status(400).json({ error: 'Images only' });
  const blob = await put('site/' + Date.now() + '.jpg', buf, {
    access: 'public',
    contentType: type,
    addRandomSuffix: true,
  });
  return res.status(200).json({ url: blob.url });
}
