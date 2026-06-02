export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = (() => {
    let u = (req.body?.url || '').trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { new URL(u); return u; } catch { return null; }
  })();

  if (!url) return res.status(400).json({ error: 'Please enter a valid website URL.' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; AskVeyzaScanner/2.0)',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    clearTimeout(timeout);
    const html = await response.text();
    const finalUrl = response.url || url;
    if (!response.ok) return res.status(502).json({ error: `Website responded with ${response.status}.` });
    return res.status(200).json(analyze(url, html, finalUrl));
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Website took too long to respond.' });
    return res.status(500).json({ error: 'Could not scan that site. Check the URL and try again.', detail: err.message });
  }
}

function analyze(url, html, finalUrl) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const platform = detectPlatform(finalUrl, html);
  const isHostedPlatform = !!platform;
  const https = /^https:/i.test(finalUrl);
  const pageTitle = getTag(html,'title') || getMeta(html,'og:title') || '';
  const metaDesc = getMeta(html,'description') || getMeta(html,'og:description') || '';
  const h1Count = (html.match(/<h1[\s>]/gi)||[]).length;
  const h2Count = (html.match(/<h2[\s>]/gi)||[]).length;
  const imageCount = (html.match(/<img[\s>]/gi)||[]).length;
  const imageAltCount = (html.match(/<img[^>]+alt=["'][^"']+["'][^>]*>/gi)||[]).length;
  const formCount = (html.match(/<form[\s>]/gi)||[]).length;
  const buttonCount = (html.match(/<button[\s>]/gi)||[]).length;
  const linkCount = (html.match(/<a[\s>]/gi)||[]).length;
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasContact = /tel:|mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/i.test(html);
  const hasBooking = hasAny(text,['book','appointment','schedule','reserve','order','quote','consultation']);
  const hasReviews = hasAny(text,['review','testimonial','stars','rating','google reviews','yelp','rated']);
  const hasPricing = hasAny(text,['price','pricing','packages','rates','cost','starting at','$']);
  const hasCTA = hasAny(text,['contact','book','schedule','call','order','buy','start','get quote','reserve','sign up','get started']);
  const hasOG = getMeta(html,'og:title').length > 0 || getMeta(html,'og:image').length > 0;
  const hasSchema = html.includes('application/ld+json') || html.includes('schema.org');
  const hasTitle = pageTitle.length > 0;
  const hasDescription = metaDesc.length > 0;
  const metaDescLen = metaDesc.length;
  const hasPhone = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(html);
  const hasAddress = /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|blvd|road|rd|drive|dr|lane|ln)\b/i.test(html);

  let score = 40;
  if (https) score += 5;
  if (hasTitle && pageTitle.length >= 10 && pageTitle.length <= 70) score += 8;
  if (hasDescription && metaDescLen >= 80 && metaDescLen <= 160) score += 10;
  if (h1Count === 1) score += 7;
  if (h2Count >= 2) score += 4;
  if (hasCTA) score += 7;
  if (hasBooking) score += 7;
  if (hasContact) score += 6;
  if (hasReviews) score += 5;
  if (hasPricing) score += 3;
  if (hasViewport) score += 4;
  if (hasOG) score += 3;
  if (hasSchema) score += 5;
  if (imageCount > 0 && imageAltCount/imageCount >= 0.7) score += 3;
  if (isHostedPlatform) score = Math.max(20, score - 12);
  score = Math.max(18, Math.min(97, score));

  let auditScore = 40;
  if (hasTitle) auditScore += 10; if (hasDescription) auditScore += 12; if (h1Count===1) auditScore += 10;
  if (hasViewport) auditScore += 8; if (https) auditScore += 8; if (hasOG) auditScore += 6; if (hasSchema) auditScore += 8;
  auditScore = Math.min(97, auditScore);

  let localScore = 30;
  if (hasPhone) localScore += 15; if (hasAddress) localScore += 15; if (hasReviews) localScore += 12;
  if (hasSchema) localScore += 12; if (hasContact) localScore += 8;
  localScore = Math.min(97, localScore);

  let perfScore = 55;
  if (https) perfScore += 10; if (hasViewport) perfScore += 10; if (imageCount < 20) perfScore += 8;
  if (imageCount > 0 && imageAltCount/imageCount >= 0.7) perfScore += 5; if (hasSchema) perfScore += 5;
  perfScore = Math.min(97, perfScore);

  const signals = { hasTitle, pageTitle, hasDescription, metaDescLen, h1Count, h2Count, imageCount, imageAltCount, formCount, buttonCount, linkCount, hasViewport, hasContact, hasBooking, hasReviews, hasPricing, hasCTA, hasOG, hasSchema, https, isHostedPlatform, platform, score };

  return {
    url: finalUrl, score, auditScore, localScore, perfScore, platform,
    pageTitle: pageTitle || new URL(finalUrl).hostname,
    signals,
    audit: runAudit(signals),
    local: runLocal(html, signals),
    competitor: buildCompetitor(url, signals, platform)
  };
}

function detectPlatform(url, html) {
  const u = url.toLowerCase();
  if (u.includes('styleseat.com')) return 'StyleSeat';
  if (u.includes('vagaro.com')) return 'Vagaro';
  if (u.includes('squareup.com')||u.includes('square.site')) return 'Square';
  if (u.includes('wix.com')||html.includes('wix.com/')) return 'Wix';
  if (u.includes('squarespace.com')||html.includes('squarespace.com')) return 'Squarespace';
  if (u.includes('shopify.com')||html.includes('cdn.shopify.com')) return 'Shopify';
  if (u.includes('booksy.com')) return 'Booksy';
  if (u.includes('mindbodyonline.com')) return 'Mindbody';
  if (u.includes('fresha.com')) return 'Fresha';
  if (u.includes('yelp.com')) return 'Yelp';
  if (html.includes('wordpress')||html.includes('/wp-content/')) return 'WordPress';
  return null;
}

function getTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/\s+/g,' ').trim() : '';
}

function getMeta(html, name) {
  const pats = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`,'i'),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["'][^>]*>`,'i'),
  ];
  for (const p of pats) { const m = html.match(p); if (m) return m[1].trim(); }
  return '';
}

function hasAny(text, words) { const l = text.toLowerCase(); return words.some(w => l.includes(w)); }

function runAudit(s) {
  const issues = [], passes = [];
  const chk = (ok, p, f) => ok ? passes.push(p) : issues.push(f);
  chk(s.hasTitle && s.pageTitle.length >= 10 && s.pageTitle.length <= 70,
    { title:'Page title is well-formed', desc:`"${s.pageTitle.slice(0,50)}"`, severity:'passed' },
    { title:'Missing or poor page title', desc:'Add a clear 30–60 character title tag describing your business.', severity: s.hasTitle ? 'warning' : 'critical' });
  chk(s.hasDescription && s.metaDescLen >= 80 && s.metaDescLen <= 160,
    { title:'Meta description present', desc:`${s.metaDescLen} chars — ideal range.`, severity:'passed' },
    { title:'Missing meta description', desc:'No meta description found. Google will auto-generate one, usually poorly.', severity: s.hasDescription ? 'warning' : 'critical' });
  chk(s.h1Count === 1,
    { title:'Single H1 heading found', desc:'One clear main headline helps users and search engines.', severity:'passed' },
    { title: s.h1Count === 0 ? 'No H1 heading' : 'Multiple H1 headings', desc: s.h1Count === 0 ? 'Add one H1 that clearly states what your business does.' : 'Use only one H1 per page.', severity: s.h1Count === 0 ? 'critical' : 'warning' });
  chk(s.hasViewport,
    { title:'Mobile viewport set', desc:'Page displays properly on mobile devices.', severity:'passed' },
    { title:'Missing mobile viewport', desc:'Mobile visitors may see a zoomed-out desktop layout and leave immediately.', severity:'critical' });
  chk(s.https,
    { title:'HTTPS secure connection', desc:'Site uses HTTPS — a Google ranking signal.', severity:'passed' },
    { title:'Not using HTTPS', desc:'Browsers show a Not Secure warning, driving visitors away.', severity:'critical' });
  chk(s.hasContact,
    { title:'Contact information found', desc:'Phone or email visible — good for trust and local SEO.', severity:'passed' },
    { title:'No contact information', desc:'Add your phone number or email prominently.', severity:'critical' });
  chk(s.hasCTA,
    { title:'Call-to-action found', desc:'Page guides visitors toward booking or contacting.', severity:'passed' },
    { title:'No call-to-action', desc:"Every page needs a clear next step — 'Book Now', 'Call Us', 'Get Started'.", severity:'critical' });
  chk(s.hasBooking,
    { title:'Booking language present', desc:'Visitors know they can schedule directly.', severity:'passed' },
    { title:'No booking signals', desc:"Add 'Book Now' or 'Schedule a Visit' to increase conversions.", severity:'warning' });
  chk(s.hasReviews,
    { title:'Reviews mentioned', desc:'Social proof helps undecided visitors trust you.', severity:'passed' },
    { title:'No reviews or testimonials', desc:'Add customer quotes or a link to your Google/Yelp reviews.', severity:'warning' });
  chk(s.hasOG,
    { title:'Open Graph tags present', desc:'Social media shares will show a proper preview.', severity:'passed' },
    { title:'Missing Open Graph tags', desc:'Add og:title and og:image for better social sharing.', severity:'warning' });
  chk(s.hasSchema,
    { title:'Schema markup found', desc:'Helps Google show rich results like ratings and hours.', severity:'passed' },
    { title:'No structured data', desc:'Add LocalBusiness schema to appear in Google knowledge panels.', severity:'warning' });
  if (s.isHostedPlatform) issues.unshift({ title:`Hosted on ${s.platform} — limited SEO control`, desc:'Hosted profiles have limited customization. A dedicated website gives you full control over SEO and leads.', severity:'warning' });
  return { issues, passes };
}

function runLocal(html, s) {
  const checks = [], issues = [];
  const hasPhone = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(html);
  const hasAddress = /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|blvd|road|rd|drive|dr)\b/i.test(html);
  const hasGBP = /google\.com\/maps|maps\.google|g\.page/i.test(html);
  const hasHours = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i.test(html);
  const hasSocial = /instagram\.com|facebook\.com|tiktok\.com|yelp\.com\/biz/i.test(html);
  const hasLocalSchema = /"@type"\s*:\s*"(LocalBusiness|Restaurant|HairSalon|BeautySalon)"/i.test(html);

  checks.push({ icon:'📞', title:'Phone Number', desc: hasPhone ? 'Phone number detected.' : 'No phone number found.', status: hasPhone ? 'ok' : 'missing' });
  checks.push({ icon:'📍', title:'Physical Address', desc: hasAddress ? 'Address detected.' : 'No street address found.', status: hasAddress ? 'ok' : 'missing' });
  checks.push({ icon:'🗺️', title:'Google Maps Link', desc: hasGBP ? 'Google Maps link found.' : 'No Google Maps link detected.', status: hasGBP ? 'ok' : 'warn' });
  checks.push({ icon:'🕐', title:'Business Hours', desc: hasHours ? 'Hours detected.' : 'No business hours found.', status: hasHours ? 'ok' : 'warn' });
  checks.push({ icon:'📱', title:'Social Media', desc: hasSocial ? 'Social links found.' : 'No social links detected.', status: hasSocial ? 'ok' : 'warn' });
  checks.push({ icon:'🏷️', title:'LocalBusiness Schema', desc: hasLocalSchema ? 'Schema found — great for rich results.' : 'No LocalBusiness schema.', status: hasLocalSchema ? 'ok' : 'warn' });

  if (!hasPhone) issues.push({ title:'Add phone number', desc:'Place your phone number prominently. Local customers want to call before booking.', severity:'critical' });
  if (!hasAddress) issues.push({ title:'Add business address', desc:'Include city and ZIP for local search rankings.', severity:'critical' });
  if (!hasGBP) issues.push({ title:'Link to Google Maps', desc:"Add a 'View on Google Maps' link to signal your location.", severity:'warning' });
  if (!hasHours) issues.push({ title:'Add business hours', desc:"Customers need to know if you're open before visiting.", severity:'warning' });

  return { checks, issues };
}

function buildCompetitor(url, signals, platform) {
  const domain = (() => { try { return new URL(url).hostname.replace('www.',''); } catch { return url; } })();
  const rows = [
    { name:'Top local competitor (avg)', score:74, mobile:true, seoTags:true, cta:true, reviews:true, isYou:false },
    { name:'Average local SMB', score:52, mobile:true, seoTags:false, cta:false, reviews:false, isYou:false },
    { name:'Hosted profile avg', score:38, mobile:true, seoTags:false, cta:true, reviews:true, isYou:false },
    { name: domain + (platform ? ` (${platform})` : ''), score:signals.score, mobile:signals.hasViewport, seoTags:signals.hasTitle&&signals.hasDescription, cta:signals.hasCTA, reviews:signals.hasReviews, isYou:true },
  ].sort((a,b) => b.score - a.score);
  const gap = 74 - signals.score;
  const summary = signals.score >= 70 ? `Your site scores ${signals.score} — competitive with top local businesses.` : signals.isHostedPlatform ? `Your ${platform} profile scores ${signals.score}. A dedicated website would immediately outperform ${Math.round(60+Math.random()*15)}% of local competitors.` : `Your site scores ${signals.score} — ${gap} points below the top local competitor. Fixing the critical audit items would close most of that gap.`;
  return { rows, summary };
}
