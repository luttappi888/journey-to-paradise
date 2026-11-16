import { redis, authed } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const data = await redis.get('site');
    return res.status(200).json(data || null);
  }
  if (req.method === 'PUT') {
    if (!authed(req)) return res.status(401).json({ error: 'Not allowed' });
    const d = req.body;
    if (!d || !Array.isArray(d.pk) || !d.b) return res.status(400).json({ error: 'Bad data' });
    delete d.pw;
    await redis.set('site', d);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).end();
}
