import { redis, authed } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    const { type, data } = req.body || {};
    if (!['partner', 'enquiry'].includes(type) || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Bad data' });
    }
    const clean = {};
    Object.entries(data).slice(0, 20).forEach(([k, v]) => {
      clean[String(k).slice(0, 80)] = String(v).slice(0, 2000);
    });
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      time: new Date().toISOString(),
      data: clean,
    };
    await redis.lpush('subs', item);
    await redis.ltrim('subs', 0, 499);
    return res.status(200).json({ ok: true });
  }
  if (!authed(req)) return res.status(401).json({ error: 'Not allowed' });
  if (req.method === 'GET') {
    const list = await redis.lrange('subs', 0, 199);
    return res.status(200).json(list);
  }
  if (req.method === 'DELETE') {
    const id = req.query.id;
    const all = await redis.lrange('subs', 0, -1);
    const keep = all.filter((x) => x.id !== id);
    await redis.del('subs');
    if (keep.length) await redis.rpush('subs', ...keep);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).end();
}
