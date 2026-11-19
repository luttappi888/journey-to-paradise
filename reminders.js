import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { redis } from './_lib.js';

const same = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
function who(req) {
  const u = String(req.headers['x-user'] || '').trim().toLowerCase();
  const p = req.headers['x-pass'];
  for (const n of [1, 2]) {
    const name = process.env['USER' + n + '_NAME'], pass = process.env['USER' + n + '_PASS'];
    if (name && pass && same(u, name.toLowerCase()) && same(p, pass)) return name;
  }
  return null;
}
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". The two staff logins can also run a test.
  const isCron = process.env.CRON_SECRET && req.headers.authorization === 'Bearer ' + process.env.CRON_SECRET;
  if (!isCron && !who(req)) return res.status(401).json({ error: 'Not allowed' });
  const test = req.query.test === '1';

  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  const to = (process.env.ALERT_EMAILS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!user || !pass || !to.length) {
    return res.status(500).json({ error: 'Email is not set up. Add GMAIL_USER, GMAIL_APP_PASSWORD and ALERT_EMAILS in Vercel, then redeploy.' });
  }

  const ist = (ms) => new Date(Date.now() + 19800000 + ms).toISOString().slice(0, 10);
  const today = ist(0), soon = ist(3 * 864e5);
  const all = Object.values((await redis.hgetall('led:adv')) || {});
  const items = all
    .filter((x) => x.due && (x.total || 0) - x.amount > 0 && x.due <= soon)
    .sort((a, b) => a.due.localeCompare(b.due));
  if (!items.length && !test) return res.status(200).json({ sent: 0, note: 'Nothing due' });

  const when = (d) => {
    const n = Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
    return n < 0 ? 'OVERDUE by ' + -n + ' day(s)' : n === 0 ? 'due TODAY' : 'due in ' + n + ' day(s)';
  };
  const line = (x) => `${x.customer}${x.trip ? ' (' + x.trip + ')' : ''}: balance ${inr(x.total - x.amount)}, ${when(x.due)} [${x.due}]${x.phone ? ', phone ' + x.phone : ''}`;
  const text = items.length ? 'Payments to collect:\n\n' + items.map(line).join('\n') : 'This is a test email from your Journey to Paradise accounts app. Email alerts are working. No payments are due in the next 3 days.';
  const html = items.length
    ? '<h3>Payments to collect</h3><ul>' + items.map((x) => `<li><b>${esc(x.customer)}</b>${x.trip ? ' (' + esc(x.trip) + ')' : ''}: balance <b>${inr(x.total - x.amount)}</b>, ${when(x.due)} (${esc(x.due)})${x.phone ? ', phone ' + esc(x.phone) : ''}</li>`).join('') + '</ul>'
    : '<p>' + esc(text) + '</p>';

  try {
    const mail = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await mail.sendMail({
      from: 'Journey to Paradise Accounts <' + user + '>',
      to: to.join(','),
      subject: items.length ? 'Payments due: ' + items.length + ' customer(s)' : 'Test: email alerts are working',
      text, html,
    });
    return res.status(200).json({ sent: items.length, test });
  } catch (e) {
    return res.status(500).json({ error: 'Could not send email. Check GMAIL_USER and the app password.' });
  }
}
