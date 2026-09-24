'use strict';
const dns = require('node:dns').promises;
const net = require('node:net');
const https = require('node:https');
const http = require('node:http');

function publicIPv4(address) {
  if (net.isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
function normalize(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Enter a public business website address.');
  const raw = input.trim();
  const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : 'https://' + raw);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port || net.isIP(u.hostname.replace(/[\[\]]/g, '')) || !u.hostname.includes('.') || /\.(local|localhost|internal|test|invalid|example)\.?$/i.test(u.hostname)) throw new Error('Use a public website on its standard HTTP or HTTPS port.');
  u.hash = ''; return u;
}
async function lookupPublic(host) {
  let timer;
  try {
    const addresses = await Promise.race([dns.lookup(host, { all: true, family: 4 }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Website address lookup timed out.')), 2500); })]);
    if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw new Error('That address is not a supported public website.');
    return addresses[0].address;
  } finally { clearTimeout(timer); }
}
async function fetchPage(input, deadline, redirects = 0, plain = false) {
  const url = normalize(String(input));
  const address = await lookupPublic(url.hostname);
  const remaining = Math.min(9000, deadline - Date.now());
  if (remaining <= 0) throw new Error('Scan time limit reached.');
  const started = Date.now();
  const result = await new Promise((resolve, reject) => {
    let finished = false, timer;
    const settle = (error, value) => { if (finished) return; finished = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, {
      method: 'GET', agent: false, family: 4,
      // Pin the validated DNS result to the actual socket to prevent rebinding.
      lookup: (_host, options, cb) => options.all ? cb(null, [{ address, family: 4 }]) : cb(null, address, 4),
      headers: { 'User-Agent': 'AskVeyzaReview/4.0 (+https://www.askveyza.com)', Accept: plain ? 'text/plain' : 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) { const location = response.headers.location; response.destroy(); return settle(null, { redirect: location }); }
      if (response.statusCode < 200 || response.statusCode >= 300) { response.destroy(); return settle(new Error(`Website returned HTTP ${response.statusCode}.`)); }
      const type = String(response.headers['content-type'] || '');
      if (!(plain ? /^text\/plain/i : /^(text\/html|application\/xhtml\+xml)/i).test(type)) { response.destroy(); return settle(new Error('The website did not return a supported page type.')); }
      if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.destroy(); return settle(new Error('This site requires a compressed response; review it manually.')); }
      const chunks = []; let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > (plain ? 65536 : 1024 * 1024)) { response.destroy(); settle(new Error('Page exceeds the scan size limit.')); } else chunks.push(chunk); });
      response.on('end', () => settle(null, { url: url.href, html: Buffer.concat(chunks).toString('utf8'), bytes, fetchMs: Date.now() - started }));
      response.on('error', e => settle(e));
    });
    request.on('error', e => settle(e));
    timer = setTimeout(() => { request.destroy(); settle(new Error('Website response timed out.')); }, remaining);
    request.end();
  });
  if (Object.hasOwn(result, 'redirect')) {
    if (!result.redirect || redirects >= 3) throw new Error('Too many website redirects.');
    return fetchPage(new URL(result.redirect, url), deadline, redirects + 1, plain);
  }
  return result;
}
const clean = text => String(text || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
  return out;
}
function analyze(page) {
  const html = page.html.replace(/<!--[\s\S]*?-->/g, '');
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0]));
  const meta = key => tags.find(a => (a.name || a.property || '').toLowerCase() === key)?.content || '';
  const links = [...html.matchAll(/<a\b[^>]*>/gi)].map(m => attrs(m[0]).href).filter(Boolean);
  const visible = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const text = clean(visible);
  const title = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0, 250);
  const description = clean(meta('description')).slice(0, 400);
  const images = [...visible.matchAll(/<img\b[^>]*>/gi)].map(m => attrs(m[0]));
  const missingAlt = images.filter(a => !Object.hasOwn(a, 'alt')).length;
  const social = links.filter(h => /^https?:\/\/(www\.)?(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com|youtube\.com|yelp\.com|x\.com)\//i.test(h)).slice(0, 12);
  const findings = [];
  const add = (id, label, found, evidence, action, category) => findings.push({ id, label, status: found ? 'detected' : 'review', evidence: String(evidence).slice(0, 450), action, category });
  add('https', 'Secure address', page.url.startsWith('https:'), page.url, 'Use HTTPS for the public website.', 'Foundation');
  add('title', 'Page title', !!title, title || 'No title tag found.', 'Write a useful page title describing the service and business.', 'Search');
  add('description', 'Search description', !!description, description || 'No meta description found.', 'Add a clear description. Search engines may choose different text.', 'Search');
  add('heading', 'Main heading', /<h1[\s>]/i.test(visible), clean(visible.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || 'No H1 found.', 'Review the main heading and page structure.', 'Clarity');
  add('mobile', 'Mobile viewport setting', !!meta('viewport'), meta('viewport') || 'No viewport meta tag found.', 'Add a viewport setting and test the layout on a phone.', 'Foundation');
  add('contact', 'Contact link', links.some(h => /^(tel:|mailto:)/i.test(h)), links.filter(h => /^(tel:|mailto:)/i.test(h)).join(' · ') || 'No telephone or email link found in the fetched page.', 'Check that customers can reach the business easily.', 'Inquiries');
  add('action', 'Inquiry or booking route', /<(form)\b/i.test(visible) || /\b(book|schedule|request a quote|get a quote|contact us)\b/i.test(text), 'Text and form check only; submission and booking completion are not tested.', 'Make the next step clear and test the full inquiry flow.', 'Inquiries');
  add('alt', 'Image alternative attributes', missingAlt === 0, `${images.length} image tags; ${missingAlt} without an alt attribute. Empty alt can be correct for decorative images.`, 'Review missing alternatives and whether each description is useful.', 'Foundation');
  add('share', 'Social sharing image', !!meta('og:image'), meta('og:image') || 'No Open Graph image found.', 'Set a share image and inspect the link preview.', 'Visibility');
  add('social', 'Social profile links', social.length > 0, social.join(' · ') || 'No supported social profile link found.', 'Link current business profiles where useful.', 'Visibility');
  add('canonical', 'Preferred page address', /<link\b[^>]*\brel=["']canonical["']/i.test(html), 'Checks for a canonical tag; does not verify indexing.', 'Review the preferred URL with your indexing setup.', 'Search');
  add('analytics', 'Analytics code signal', /googletagmanager\.com|google-analytics\.com|clarity\.ms|plausible\.io|vercel-scripts\.com|\/insights\/script\.js/i.test(html), 'HTML signal only. Account access, consent, events, traffic, and sales are not verified.', 'Check authorized analytics reports and test agreed conversion events.', 'Measurement');
  return { url: page.url, title, description, bytes: page.bytes, fetchMs: page.fetchMs, findings, social, links };
}
async function scan(input) {
  const start = Date.now(), deadline = start + 24000;
  const first = await fetchPage(normalize(input), deadline);
  const home = analyze(first);
  const candidates = [...new Set(home.links.map(h => { try { const u = new URL(h, home.url); u.hash = ''; u.search = ''; return u.origin === new URL(home.url).origin && /\/(contact|services?|about|book|pricing)(\/|$)/i.test(u.pathname) ? u.href : ''; } catch { return ''; } }).filter(u => u && u !== home.url))].slice(0, 3);
  const pages = [home], warnings = [];
  const results = await Promise.allSettled(candidates.map(url => fetchPage(url, deadline).then(analyze)));
  results.forEach((result, i) => result.status === 'fulfilled' ? pages.push(result.value) : warnings.push({ url: candidates[i], message: 'Could not retrieve this page. Review it manually.' }));
  pages.forEach(p => delete p.links);
  return { version: 1, scannedAt: new Date().toISOString(), requestedUrl: normalize(input).href, pages, warnings, durationMs: Date.now() - start, scope: 'Up to four public HTML pages. JavaScript is not rendered. No private accounts, rankings, traffic, sales, form submissions, or visitor performance are measured.' };
}
module.exports = { scan, analyze, normalize, publicIPv4, fetchPage };
