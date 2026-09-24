'use strict';
const crypto = require('node:crypto');
const COOKIE = 'veyza_owner';
const TTL = 60 * 60 * 4;
const buckets = new Map();

function secret() {
  const value = process.env.OWNER_ACCESS_KEY || '';
  return value.length >= 24 && value.length <= 512 ? value : null;
}
function equal(a, b) {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
}
function sign(payload) {
  return crypto.createHmac('sha256', secret()).update('owner-session:' + payload).digest('base64url');
}
function issue(now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + TTL, nonce: crypto.randomBytes(18).toString('hex') })).toString('base64url');
  return payload + '.' + sign(payload);
}
function authenticated(req, now = Date.now()) {
  if (!secret()) return false;
  const cookie = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  if (!cookie || cookie.length > 1024) return false;
  const [payload, signature, extra] = cookie.slice(COOKIE.length + 1).split('.');
  if (!payload || !signature || extra || !equal(sign(payload), signature)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const current = Math.floor(now / 1000);
    return Number.isInteger(data.exp) && data.exp > current && data.exp <= current + TTL;
  } catch { return false; }
}
function sameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    const local = !process.env.VERCEL && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
    return origin.host === req.headers.host && (origin.protocol === 'https:' || (local && origin.protocol === 'http:'));
  } catch { return false; }
}
function headers(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}
function setCookie(req, res, token) {
  const local = !process.env.VERCEL && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? TTL : 0}${local ? '' : '; Secure'}`);
}
function limited(req, category, limit, windowMs) {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
  // This is an extra per-instance throttle, not a distributed rate limiter.
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const key = category + ':' + ip;
  if (buckets.size > 3000 && !buckets.has(key)) return true;
  const item = buckets.get(key) || { count: 0, until: now + windowMs };
  item.count++; buckets.set(key, item);
  return item.count > limit;
}
function guard(req, res) {
  headers(res);
  if (!secret()) { res.status(503).json({ error: 'Owner sign-in is not activated yet. Add OWNER_ACCESS_KEY in Vercel and redeploy.' }); return false; }
  if (!authenticated(req)) { res.status(401).json({ error: 'Unlock the owner workspace to run a scan.' }); return false; }
  if (!sameOrigin(req)) { res.status(403).json({ error: 'Open the workspace on this site to continue.' }); return false; }
  return true;
}
module.exports = { secret, equal, issue, authenticated, sameOrigin, headers, setCookie, limited, guard, TTL };
