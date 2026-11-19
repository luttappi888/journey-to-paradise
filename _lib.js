import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export function authed(req) {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) return false;
  const a = Buffer.from(String(req.headers['x-admin-password'] || ''));
  const b = Buffer.from(p);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function readBuffer(req) {
  if (Buffer.isBuffer(req.body) && req.body.length) return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}
