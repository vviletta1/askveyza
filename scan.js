module.exports = async function handler(req, res) {
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
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; AskVeyzaScanner/3.0)',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    clearTimeout(timeout);
    const loadMs = Date.now() - start;
    const html = await response.text();
    const finalUrl = response.url || url;
    const headers = response.headers;
    if (!response.ok) return res.status(502).json({ error: `Website responded with ${response.status}.` });

    let hasRobots = false, hasSitemap = false;
    try {
      const origin = new URL(finalUrl).origin;
      const rc = new AbortController();
      const rt = setTimeout(() => rc.abort(), 4000);
      const robotsRes = await fetch(origin + '/robots.txt', { signal: rc.signal });
      clearTimeout(rt);
      hasRobots = robotsRes.ok;
      if (robotsRes.ok) { const t = await robotsRes.text(); hasSitemap = /sitemap:/i.test(t); }
    } catch (e) {}

    return res.status(200).json(analyze(url, html, finalUrl, loadMs, headers, hasRobots, hasSitemap));
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Website took too long to respond (12s+). Slow load is itself a problem worth flagging.' });
    return res.status(500).json({ error: 'Could not scan that site. Check the URL and try again.', detail: err.message });
  }
};

function analyze(url, html, finalUrl, loadMs, headers, hasRobots, hasSitemap) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const platform = detectPlatform(finalUrl, html);
  const isHostedPlatform = !!platform;
  const https = /^https:/i.test(finalUrl);
  const htmlSize = html.length;

  const pageTitle = getTag(html,'title') || getMeta(html,'og:title') || '';
  const metaDesc = getMeta(html,'description') || getMeta(html,'og:description') || '';
  const h1Count = (html.match(/<h1[\s>]/gi)||[]).length;
  const h2Count = (html.match(/<h2[\s>]/gi)||[]).length;
  const imageCount = (html.match(/<img[\s>]/gi)||[]).length;
  const imageAltCount = (html.match(/<img[^>]+alt=["'][^"']+["'][^>]*>/gi)||[]).length;
  const imagesWithoutAlt = Math.max(0, imageCount - imageAltCount);
  const lazyImages = (html.match(/loading=["']lazy["']/gi)||[]).length;
  const formCount = (html.match(/<form[\s>]/gi)||[]).length;
  const buttonCount = (html.match(/<button[\s>]/gi)||[]).length;
  const linkCount = (html.match(/<a[\s>]/gi)||[]).length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasContact = /tel:|mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/i.test(html);
  const hasBooking = hasAny(text,['book','appointment','schedule','reserve','order','quote','consultation']);
  const hasReviews = hasAny(text,['review','testimonial','stars','rating','google reviews','yelp','rated']);
  const hasPricing = hasAny(text,['price','pricing','packages','rates','cost','starting at','$']);
  const hasCTA = hasAny(text,['contact','book','schedule','call','order','buy','start','get quote','reserve','sign up','get started']);

  const hasOG = getMeta(html,'og:title').length > 0 || getMeta(html,'og:image').length > 0;
  const hasOGImage = getMeta(html,'og:image').length > 0;
  const hasTwitterCard = /<meta[^>]+name=["']twitter:card["']/i.test(html);
  const hasSchema = html.includes('application/ld+json') || html.includes('schema.org');
  const hasLocalSchema = /"@type"\s*:\s*"(LocalBusiness|Restaurant|HairSalon|BeautySalon|NailSalon|MedicalBusiness|Dentist|Store|ProfessionalService|HealthAndBeautyBusiness|DaySpa)"/i.test(html);
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hasFavicon = /<link[^>]+rel=["'](?:icon|shortcut icon)["']/i.test(html);
  const hasLangAttr = /<html[^>]+lang=/i.test(html);
  const hasAnalytics = /google-analytics|gtag|googletagmanager|G-[A-Z0-9]+|UA-\d+|fbq\(|facebook\.com\/tr|hotjar|clarity\.ms/i.test(html);
  const hasPixel = /fbq\(|facebook\.com\/tr|pintrk|ttq\.|snaptr/i.test(html);
  const hasCookieConsent = /cookie.{0,20}consent|cookie.{0,20}policy|accept.{0,10}cookies|gdpr/i.test(html);
  const hasBreadcrumb = /"@type"\s*:\s*"BreadcrumbList"/i.test(html) || /breadcrumb/i.test(html);
  const inlineStyles = (html.match(/style=["']/gi)||[]).length;
  const externalScripts = (html.match(/<script[^>]+src=/gi)||[]).length;
  const hasMixedContent = https && /<(?:img|script|link)[^>]+(?:src|href)=["']http:\/\//i.test(html);

  const titleLen = pageTitle.length;
  const descLen = metaDesc.length;
  const hasTitle = titleLen > 0;
  const hasDescription = descLen > 0;

  const hasPhone = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(html);
  const hasAddress = /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct|suite|ste)\b/i.test(html) || /\b[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}\b/.test(html);
  const hasGBP = /google\.com\/maps|maps\.google|g\.page|goo\.gl\/maps/i.test(html);
  const hasHours = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(html);
  const hasSocial = /instagram\.com|facebook\.com|tiktok\.com|twitter\.com|yelp\.com\/biz/i.test(html);
  const socialCount = ['instagram.com','facebook.com','tiktok.com','twitter.com','yelp.com'].filter(s => html.toLowerCase().includes(s)).length;

  const compression = headers.get('content-encoding') || '';
  const hasCaching = !!(headers.get('cache-control') || headers.get('expires'));
  const hasCompression = /gzip|br|deflate/i.test(compression);
  const pageSizeKB = Math.round(htmlSize / 1024);
  const loadSeconds = (loadMs / 1000).toFixed(1);

  // SITE AUDIT
  let auditScore = 100;
  if (!hasTitle) auditScore -= 12; else if (titleLen < 30 || titleLen > 60) auditScore -= 5;
  if (!hasDescription) auditScore -= 10; else if (descLen < 120 || descLen > 160) auditScore -= 4;
  if (h1Count === 0) auditScore -= 10; else if (h1Count > 1) auditScore -= 6;
  if (h2Count < 2) auditScore -= 3;
  if (!hasCanonical) auditScore -= 8;
  if (!hasSchema) auditScore -= 8;
  if (!hasLocalSchema && !isHostedPlatform) auditScore -= 6;
  if (!hasOGImage) auditScore -= 5;
  if (!hasTwitterCard) auditScore -= 3;
  if (!hasFavicon) auditScore -= 3;
  if (!hasLangAttr) auditScore -= 4;
  if (!hasViewport) auditScore -= 10;
  if (!https) auditScore -= 15;
  if (hasMixedContent) auditScore -= 8;
  if (imagesWithoutAlt > 0) auditScore -= Math.min(10, imagesWithoutAlt * 2);
  if (!hasRobots) auditScore -= 5;
  if (!hasSitemap) auditScore -= 5;
  if (!hasBreadcrumb) auditScore -= 3;
  if (wordCount < 300) auditScore -= 8;
  auditScore = Math.max(15, Math.min(98, auditScore));

  // PERFORMANCE
  let perfScore = 100;
  if (loadMs > 1000) perfScore -= 8;
  if (loadMs > 2500) perfScore -= 12;
  if (loadMs > 4000) perfScore -= 15;
  if (pageSizeKB > 100) perfScore -= 6;
  if (pageSizeKB > 300) perfScore -= 10;
  if (pageSizeKB > 600) perfScore -= 12;
  if (!hasCompression) perfScore -= 12;
  if (!hasCaching) perfScore -= 8;
  if (imageCount > 0 && lazyImages === 0) perfScore -= 8;
  if (imageCount > 25) perfScore -= 6;
  if (externalScripts > 10) perfScore -= 8;
  if (externalScripts > 20) perfScore -= 8;
  if (inlineStyles > 30) perfScore -= 4;
  perfScore = Math.max(15, Math.min(98, perfScore));

  // LOCAL SEO
  let localScore = 100;
  if (!hasPhone) localScore -= 18;
  if (!hasAddress) localScore -= 18;
  if (!hasGBP) localScore -= 12;
  if (!hasHours) localScore -= 10;
  if (!hasReviews) localScore -= 12;
  if (!hasLocalSchema) localScore -= 14;
  if (socialCount === 0) localScore -= 8; else if (socialCount < 2) localScore -= 4;
  if (!hasContact) localScore -= 6;
  localScore = Math.max(12, Math.min(97, localScore));

  let score = Math.round(auditScore * 0.4 + perfScore * 0.3 + localScore * 0.3);
  if (isHostedPlatform) score = Math.max(20, score - 8);
  score = Math.max(15, Math.min(96, score));

  const signals = {
    hasTitle, pageTitle, hasDescription, metaDescLen: descLen, titleLen,
    h1Count, h2Count, imageCount, imageAltCount, imagesWithoutAlt, lazyImages,
    formCount, buttonCount, linkCount, wordCount,
    hasViewport, hasContact, hasBooking, hasReviews, hasPricing, hasCTA,
    hasOG, hasOGImage, hasTwitterCard, hasSchema, hasLocalSchema, hasCanonical,
    hasFavicon, hasLangAttr, hasAnalytics, hasPixel, hasCookieConsent, hasBreadcrumb,
    hasRobots, hasSitemap, hasCompression, hasCaching, hasMixedContent,
    https, isHostedPlatform, platform, score, loadSeconds, pageSizeKB,
    externalScripts, socialCount, hasPhone, hasAddress, hasGBP, hasHours, hasSocial
  };

  return {
    url: finalUrl, score, auditScore, localScore, perfScore, platform,
    pageTitle: pageTitle || new URL(finalUrl).hostname,
    signals,
    audit: runAudit(signals),
    local: runLocal(signals),
    competitor: buildCompetitor(url, signals, platform)
  };
}

function detectPlatform(url, html) {
  const u = url.toLowerCase();
  if (u.includes('styleseat.com')) return 'StyleSeat';
  if (u.includes('vagaro.com')) return 'Vagaro';
  if (u.includes('zoca.com')) return 'Zoca';
  if (u.includes('squareup.com')||u.includes('square.site')) return 'Square';
  if (u.includes('wix.com')||html.includes('wix.com/')||html.includes('_wixCssStates')) return 'Wix';
  if (u.includes('squarespace.com')||html.includes('static1.squarespace')) return 'Squarespace';
  if (u.includes('shopify')||html.includes('cdn.shopify.com')) return 'Shopify';
  if (u.includes('booksy.com')) return 'Booksy';
  if (u.includes('mindbodyonline.com')) return 'Mindbody';
  if (u.includes('fresha.com')) return 'Fresha';
  if (u.includes('yelp.com')) return 'Yelp';
  if (html.includes('/wp-content/')||html.includes('wp-json')) return 'WordPress';
  return null;
}

function getTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim() : '';
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
  const add = (ok, p, f) => ok ? passes.push(p) : issues.push(f);

  add(s.hasCanonical,
    { title:'Canonical tag present', desc:'Search engines know which version of this page to index.', severity:'passed' },
    { title:'Missing canonical tag', desc:'Without a canonical tag, Google may treat your URL variations (tracking parameters, www, trailing slashes) as duplicate pages, splitting your ranking power. This is the #1 hidden issue on otherwise-good sites.', severity:'critical' });

  add(s.hasLocalSchema,
    { title:'LocalBusiness schema found', desc:'Google can show your hours, rating, and phone directly in search.', severity:'passed' },
    { title:'No LocalBusiness structured data', desc:'You are missing the schema markup that makes Google display your business info (hours, reviews, map pin) directly in search and Maps. This is the single biggest local SEO lever and most sites skip it.', severity:'critical' });

  add(!s.hasMixedContent,
    { title:'No mixed content', desc:'All resources load securely over HTTPS.', severity:'passed' },
    { title:'Mixed content detected', desc:'Some images or scripts load over insecure HTTP on your HTTPS page. Browsers block these or show security warnings, and it hurts ranking.', severity:'critical' });

  add(s.titleLen >= 30 && s.titleLen <= 60,
    { title:'Title length optimized', desc:`${s.titleLen} characters, within the range Google displays fully.`, severity:'passed' },
    { title: s.titleLen === 0 ? 'Missing page title' : s.titleLen < 30 ? 'Title tag too short' : 'Title tag too long', desc: s.titleLen === 0 ? 'No title tag found.' : s.titleLen < 30 ? `Your title is only ${s.titleLen} characters. You are leaving ranking keywords unused, aim for 30 to 60 with your service plus city.` : `Your title is ${s.titleLen} characters and gets cut off in search results. Trim to under 60.`, severity: s.titleLen === 0 ? 'critical' : 'warning' });

  add(s.metaDescLen >= 120 && s.metaDescLen <= 160,
    { title:'Meta description optimized', desc:`${s.metaDescLen} characters, uses the full space Google gives you.`, severity:'passed' },
    { title: s.metaDescLen === 0 ? 'Missing meta description' : 'Meta description not optimized', desc: s.metaDescLen === 0 ? 'No meta description, Google auto-generates one, usually poorly.' : `Your description is ${s.metaDescLen} characters. The ideal is 120 to 160 with a clear call to action.`, severity: s.metaDescLen === 0 ? 'warning' : 'info' });

  add(s.hasSitemap,
    { title:'Sitemap referenced', desc:'Search engines can find and crawl all your pages.', severity:'passed' },
    { title:'No sitemap found', desc:'A sitemap.xml helps Google discover and index every page. Without it, deeper pages may never get crawled. Most small business sites are missing this.', severity:'warning' });

  add(s.hasRobots,
    { title:'robots.txt present', desc:'You control what search engines crawl.', severity:'passed' },
    { title:'No robots.txt file', desc:'A robots.txt file tells search engines how to crawl your site efficiently, so crawlers do not waste your crawl budget on unimportant pages.', severity:'warning' });

  add(s.imagesWithoutAlt === 0,
    { title:'All images have alt text', desc:`All ${s.imageCount} images are accessible and indexed by Google Images.`, severity:'passed' },
    { title:`${s.imagesWithoutAlt} images missing alt text`, desc:`${s.imagesWithoutAlt} of your ${s.imageCount} images have no alt text. You are invisible in Google Image search for those, and it is an accessibility/ADA gap that is increasingly a legal risk.`, severity:'warning' });

  add(s.hasOGImage,
    { title:'Social share image set', desc:'Your page shows a proper preview when shared.', severity:'passed' },
    { title:'No social share image', desc:'When someone shares your page on Facebook, Instagram, or in a text, it appears as a blank box. Add an og:image to control how it looks.', severity:'warning' });

  add(s.hasBreadcrumb,
    { title:'Breadcrumb navigation present', desc:'Helps users and search engines understand your structure.', severity:'passed' },
    { title:'No breadcrumb structure', desc:'Breadcrumbs help Google understand your page hierarchy and can show navigation paths in search results.', severity:'info' });

  add(s.wordCount >= 300,
    { title:'Sufficient content depth', desc:`${s.wordCount} words, enough for Google to understand the page.`, severity:'passed' },
    { title:'Thin content', desc:`This page has only about ${s.wordCount} words. Google favors substantial, helpful content. Aim for 300 plus words describing your services, area, and what makes you different.`, severity:'warning' });

  add(s.h1Count === 1,
    { title:'Single H1 heading', desc:'Clear page focus for search engines.', severity:'passed' },
    { title: s.h1Count === 0 ? 'No H1 heading' : `${s.h1Count} H1 headings (should be 1)`, desc: s.h1Count === 0 ? 'No main headline found, add one H1 with your primary keyword.' : 'Multiple H1s confuse search engines about your topic. Use one H1 and H2s for sections.', severity: s.h1Count === 0 ? 'critical' : 'warning' });

  add(s.hasLangAttr,
    { title:'Language declared', desc:'The lang attribute helps screen readers and search engines.', severity:'passed' },
    { title:'Missing lang attribute', desc:'Your html tag has no lang attribute. This affects accessibility and international search.', severity:'info' });

  add(s.hasFavicon,
    { title:'Favicon present', desc:'Your site icon shows in browser tabs and bookmarks.', severity:'passed' },
    { title:'No favicon detected', desc:'A favicon is the small icon in the browser tab. Missing it looks unprofessional and reduces brand recall.', severity:'info' });

  add(parseFloat(s.loadSeconds) < 2.5,
    { title:`Fast load time (${s.loadSeconds}s)`, desc:'Your page responds quickly.', severity:'passed' },
    { title:`Slow load time (${s.loadSeconds}s)`, desc:`Your page took ${s.loadSeconds}s to respond. Every second over 2.5s loses roughly 7% of visitors, and Google uses speed as a ranking factor. Compress images and reduce scripts.`, severity: parseFloat(s.loadSeconds) > 4 ? 'critical' : 'warning' });

  add(s.hasCompression,
    { title:'Compression enabled', desc:'Your pages transfer efficiently with gzip/brotli.', severity:'passed' },
    { title:'No compression enabled', desc:'Your server is not compressing pages (gzip/brotli). Enabling it can cut page size 60 to 70% and dramatically speed load times. One setting, big impact.', severity:'warning' });

  add(s.hasCaching,
    { title:'Browser caching configured', desc:'Repeat visitors load your site faster.', severity:'passed' },
    { title:'No browser caching', desc:'Without cache headers, returning visitors re-download everything each visit. Adding caching makes your site feel instant for repeat customers.', severity:'warning' });

  add(s.imageCount === 0 || s.lazyImages > 0,
    { title:'Lazy loading active', desc:'Images load as visitors scroll, speeding initial load.', severity:'passed' },
    { title:'No image lazy loading', desc:`You have ${s.imageCount} images but none lazy-load. Adding loading="lazy" means below-the-fold images do not slow your initial page load.`, severity:'warning' });

  add(s.externalScripts <= 10,
    { title:'Reasonable script count', desc:`${s.externalScripts} external scripts, manageable.`, severity:'passed' },
    { title:`Too many external scripts (${s.externalScripts})`, desc:`Each external script is a separate request that blocks rendering. ${s.externalScripts} is a lot, audit which tracking and widget scripts you actually need.`, severity:'warning' });

  add(s.hasCTA,
    { title:'Call-to-action present', desc:'Visitors have a clear next step.', severity:'passed' },
    { title:'No clear call-to-action', desc:'Add an obvious "Book Now" or "Call Us" button.', severity:'critical' });

  add(s.hasReviews,
    { title:'Social proof present', desc:'Reviews build trust with new visitors.', severity:'passed' },
    { title:'No reviews displayed', desc:'Embed your Google/Yelp reviews, social proof converts undecided visitors.', severity:'warning' });

  add(s.hasCookieConsent || !s.hasAnalytics,
    { title:'Privacy compliance OK', desc:'Cookie and tracking setup looks compliant.', severity:'passed' },
    { title:'Tracking without cookie consent', desc:'You are running analytics or tracking pixels but no cookie consent banner detected. This is a growing legal risk under state privacy laws like CCPA. Add a consent banner.', severity:'warning' });

  if (s.isHostedPlatform) issues.unshift({ title:`Hosted on ${s.platform}, limited technical control`, desc:`Your site is on ${s.platform}. These platforms cap how much technical SEO you can do, you cannot fully control canonical tags, schema, caching, or page speed. A dedicated site removes these ceilings and you own your traffic.`, severity:'warning' });

  return { issues, passes };
}

function runLocal(s) {
  const checks = [], issues = [];
  checks.push({ icon:'📞', title:'Phone Number', desc: s.hasPhone ? 'Phone number detected on page.' : 'No phone number found.', status: s.hasPhone ? 'ok' : 'missing' });
  checks.push({ icon:'📍', title:'Physical Address (NAP)', desc: s.hasAddress ? 'Address detected.' : 'No complete street address found.', status: s.hasAddress ? 'ok' : 'missing' });
  checks.push({ icon:'🗺️', title:'Google Maps Link', desc: s.hasGBP ? 'Google Maps / Business Profile linked.' : 'No Google Maps link found.', status: s.hasGBP ? 'ok' : 'warn' });
  checks.push({ icon:'🕐', title:'Business Hours', desc: s.hasHours ? 'Hours of operation listed.' : 'No business hours found.', status: s.hasHours ? 'ok' : 'warn' });
  checks.push({ icon:'⭐', title:'LocalBusiness Schema', desc: s.hasLocalSchema ? 'Local schema found, eligible for rich results.' : 'No LocalBusiness schema markup.', status: s.hasLocalSchema ? 'ok' : 'missing' });
  checks.push({ icon:'📱', title:`Social Profiles (${s.socialCount})`, desc: s.socialCount >= 2 ? 'Multiple social profiles linked.' : s.socialCount === 1 ? 'Only one social profile linked.' : 'No social profiles linked.', status: s.socialCount >= 2 ? 'ok' : s.socialCount === 1 ? 'warn' : 'missing' });

  if (!s.hasLocalSchema) issues.push({ title:'Add LocalBusiness schema markup', desc:'The highest-impact local SEO fix. LocalBusiness schema tells Google your exact name, address, phone, hours, and service area, making you eligible for the local map pack and rich results. Most competitors do not have it, so this is how you leapfrog them.', severity:'critical' });
  if (!s.hasPhone) issues.push({ title:'Add a click-to-call phone number', desc:'Local searches heavily weight click-to-call. Add your number with a tel: link so mobile users can tap to call.', severity:'critical' });
  if (!s.hasAddress) issues.push({ title:'Add consistent NAP (Name/Address/Phone)', desc:'Google cross-references your address across the web. Make sure it appears consistently in your footer and matches your Google Business Profile exactly.', severity:'critical' });
  if (!s.hasGBP) issues.push({ title:'Link your Google Business Profile', desc:'Add a "Find us on Google" link. It strengthens the connection between your site and your map listing.', severity:'warning' });
  if (!s.hasReviews) issues.push({ title:'Embed reviews and build review velocity', desc:'It is not just having reviews, Google rewards a steady stream of new ones. Set up a system to ask every happy customer, and embed them on-site.', severity:'warning' });
  if (s.socialCount < 2) issues.push({ title:'Link more social profiles', desc:'Linked, active social profiles are a trust and ranking signal. Connect at least Instagram, Facebook, and Yelp.', severity:'info' });

  return { checks, issues };
}

function buildCompetitor(url, s, platform) {
  const domain = (() => { try { return new URL(url).hostname.replace('www.',''); } catch { return url; } })();
  const rows = [
    { name:'SEO-optimized competitor', score:88, mobile:true, seoTags:true, cta:true, reviews:true, isYou:false },
    { name:'Top local competitor (avg)', score:71, mobile:true, seoTags:true, cta:true, reviews:true, isYou:false },
    { name:'Average local SMB', score:52, mobile:true, seoTags:false, cta:false, reviews:false, isYou:false },
    { name: domain + (platform ? ` (${platform})` : ''), score:s.score, mobile:s.hasViewport, seoTags:s.hasTitle&&s.hasDescription&&s.hasCanonical, cta:s.hasCTA, reviews:s.hasReviews, isYou:true },
  ].sort((a,b) => b.score - a.score);

  let summary;
  if (s.score >= 85) summary = `Your site scores ${s.score}, strong. But the gap between you and a fully SEO-optimized competitor (88 plus) is in the technical details: ${!s.hasCanonical ? 'canonical tags, ' : ''}${!s.hasLocalSchema ? 'LocalBusiness schema, ' : ''}${!s.hasSitemap ? 'sitemap, ' : ''}and page speed. These are exactly what determines who ranks number 1 vs number 3 in the map pack.`;
  else if (s.score >= 65) summary = `Your site scores ${s.score}, above the local average of 52, but a ${88 - s.score}-point gap separates you from top-ranking competitors. The difference is almost entirely technical SEO: schema markup, canonical tags, and site speed.`;
  else summary = `Your site scores ${s.score}, below where it needs to be to rank well locally. The good news: most of the gap is fixable technical SEO, not a full rebuild.`;

  return { rows, summary };
}
