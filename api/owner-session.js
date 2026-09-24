'use strict';
const auth = require('../lib/owner-auth');
module.exports = async function handler(req, res) {
  auth.headers(res);
  if (req.method === 'GET') return res.status(200).json({ configured: !!auth.secret(), authenticated: auth.authenticated(req) });
  if (!['POST', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!auth.sameOrigin(req)) return res.status(403).json({ error: 'Please open sign-in on this site.' });
  if (req.method === 'DELETE') { auth.setCookie(req, res, ''); return res.status(200).json({ ok: true }); }
  if (!auth.secret()) return res.status(503).json({ error: 'Owner sign-in is not activated. Add OWNER_ACCESS_KEY in Vercel and redeploy. You can explore the example workspace below.' });
  if (auth.limited(req, 'login', 8, 15 * 60 * 1000)) { res.setHeader('Retry-After', '900'); return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }); }
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length > 512 || !auth.equal(password, auth.secret())) return res.status(401).json({ error: 'That access key did not match.' });
  auth.setCookie(req, res, auth.issue());
  return res.status(200).json({ ok: true, expiresIn: auth.TTL });
};
