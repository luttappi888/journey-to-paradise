import crypto from 'node:crypto';
import { redis } from './_lib.js';

const K = { exp: 'led:exp', adv: 'led:adv', note: 'led:note' };
const same = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Only the two people set in USER1_* and USER2_* environment variables can get in.
function who(req) {
  const u = String(req.headers['x-user'] || '').trim().toLowerCase();
  const p = req.headers['x-pass'];
  for (const n of [1, 2]) {
    const name = process.env['USER' + n + '_NAME'], pass = process.env['USER' + n + '_PASS'];
    if (name && pass && same(u, name.toLowerCase()) && same(p, pass)) return name;
  }
  return null;
}

const s = (v, n) => String(v == null ? '' : v).slice(0, n);
const num = (v) => { const x = Number(v); return isFinite(x) && x >= 0 && x < 1e9 ? Math.round(x * 100) / 100 : null; };
const dt = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);

function clean(kind, i, me) {
  if (!i || typeof i !== 'object') return null;
  const id = /^[a-z0-9]{6,30}$/.test(i.id || '') ? i.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const base = { id, by: me, at: new Date().toISOString() };
  if (kind === 'exp') {
    const amount = num(i.amount), date = dt(i.date);
    if (amount == null || !date) return null;
    return { ...base, date, amount, cat: s(i.cat, 40), desc: s(i.desc, 300), paidBy: s(i.paidBy, 40), trip: s(i.trip, 80) };
  }
  if (kind === 'adv') {
    const amount = num(i.amount), date = dt(i.date), customer = s(i.customer, 80).trim();
    if (amount == null || !date || !customer) return null;
    const total = i.total === '' || i.total == null ? 0 : num(i.total);
    if (total == null) return null;
    return { ...base, date, customer, phone: s(i.phone, 20), trip: s(i.trip, 80), amount, total, mode: s(i.mode, 20), note: s(i.note, 300) };
  }
  if (!s(i.text, 2000).trim()) return null;
  return { ...base, title: s(i.title, 80), text: s(i.text, 2000), date: dt(i.date) || new Date().toISOString().slice(0, 10) };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const me = who(req);
  if (!me) { await new Promise((r) => setTimeout(r, 800)); return res.status(401).json({ error: 'Not allowed' }); }
  const kind = req.query.kind;
  if (kind === 'me') return res.status(200).json({ name: me });
  if (!K[kind]) return res.status(400).json({ error: 'Bad request' });

  if (req.method === 'GET') {
    const all = (await redis.hgetall(K[kind])) || {};
    return res.status(200).json(Object.values(all));
  }
  if (req.method === 'POST') {
    const item = clean(kind, req.body && req.body.item, me);
    if (!item) return res.status(400).json({ error: 'Check the details' });
    const old = await redis.hget(K[kind], item.id);
    if (old) { item.by = old.by; item.at = old.at; item.editedBy = me; }
    await redis.hset(K[kind], { [item.id]: item });
    return res.status(200).json(item);
  }
  if (req.method === 'DELETE') {
    await redis.hdel(K[kind], String(req.query.id));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).end();
}
