import { authed } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (authed(req)) return res.status(200).json({ ok: true });
  await new Promise((r) => setTimeout(r, 900));
  return res.status(401).json({ error: 'Wrong password' });
}
