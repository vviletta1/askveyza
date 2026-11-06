'use strict';
const crypto = require('node:crypto');
const auth = require('../lib/owner-auth');
const enabled = () => !!(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM_EMAIL);
module.exports = async function inquiry(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ enabled: enabled() });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!auth.sameOrigin(req)) return res.status(403).json({ error: 'Please use the form on this website.' });
  if (!enabled()) return res.status(503).json({ error: 'Direct delivery is unavailable. Your request has not been sent. Use the email or copy option below.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'JSON required.' });
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({ error: 'Invalid request.' });
  if (b.trap) return res.status(400).json({ error: 'Please try the email option.' });
  if (typeof b.business !== 'string' || !b.business.trim() || b.business.length > 120 || typeof b.email !== 'string' || b.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(b.email) || /[\r\n]/.test(b.email) || typeof b.message !== 'string' || b.message.length > 4000 || !b.message.trim()) return res.status(400).json({ error: 'Enter your business name, a valid reply email, and a message.' });
  if (auth.limited(req, 'inquiry', 3, 60 * 60 * 1000)) { res.setHeader('Retry-After', '3600'); return res.status(429).json({ error: 'Please email violetta@askveyza.com directly. Your request has not been sent.' }); }
  // Fixed recipient and sender: visitors cannot use this endpoint as an email relay.
  const payload = { from: process.env.INQUIRY_FROM_EMAIL, to: ['violetta@askveyza.com'], reply_to: b.email.trim(), subject: 'Ask.Veyza website inquiry', text: b.message.trim() + '\n\nReply email: ' + b.email.trim() };
  try {
    const id = crypto.createHash('sha256').update(JSON.stringify(payload) + Math.floor(Date.now() / 600000)).digest('hex');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok || !data.id) throw new Error('provider');
    return res.status(200).json({ ok: true });
  } catch {
    // Do not log message contents, email addresses, or credentials.
    console.error('Inquiry delivery could not be confirmed.');
    return res.status(502).json({ error: 'Delivery could not be confirmed. Your entries are still here. Please use the email or copy option.' });
  }
};
