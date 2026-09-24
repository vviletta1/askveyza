'use strict';
const auth = require('../lib/owner-auth');
const { scan, normalize } = require('../lib/site-scan');
module.exports = async function handler(req, res) {
  auth.headers(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!auth.guard(req, res)) return;
  if (auth.limited(req, 'scan', 15, 15 * 60 * 1000)) return res.status(429).json({ error: 'Scan limit reached. Try again in 15 minutes.' });
  let url;
  try { url = normalize(req.body?.url); } catch { return res.status(400).json({ error: 'Enter a public HTTP or HTTPS business website without a custom port.' }); }
  try { return res.status(200).json(await scan(url.href)); }
  catch { return res.status(502).json({ error: 'The site could not be scanned. It may block automated access, require a browser, or have timed out. Review it manually or try another public page.' }); }
};
