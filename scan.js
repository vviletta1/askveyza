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
        'user-agent': 'Mozilla/5.0 (compatible; AskVeyzaScanner/4.0 PremiumGrowthAudit)',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9'
      }
    });

    clearTimeout(timeout);

    const loadMs = Date.now() - start;
    const html = await response.text();
    const finalUrl = response.url || url;
    const headers = response.headers;

    if (!response.ok) {
      return res.status(502).json({ error: `Website responded with ${response.status}.` });
    }

    let hasRobots = false;
    let hasSitemap = false;

    try {
      const origin = new URL(finalUrl).origin;
      const rc = new AbortController();
      const rt = setTimeout(() => rc.abort(), 4000);
      const robotsRes = await fetch(origin + '/robots.txt', { signal: rc.signal });
      clearTimeout(rt);

      hasRobots = robotsRes.ok;
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        hasSitemap = /sitemap:/i.test(robotsText);
      }
    } catch (e) {}

    return res.status(200).json(analyze(url, html, finalUrl, loadMs, headers, hasRobots, hasSitemap));
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Website took too long to respond (12s+). Slow load is itself a problem worth flagging.'
      });
    }

    return res.status(500).json({
      error: 'Could not scan that site. Check the URL and try again.',
      detail: err.message
    });
  }
};

function analyze(url, html, finalUrl, loadMs, headers, hasRobots, hasSitemap) {
  const cleanHtml = html || '';
  const text = cleanHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lowerText = text.toLowerCase();
  const lowerHtml = cleanHtml.toLowerCase();
  const platform = detectPlatform(finalUrl, cleanHtml);
  const isHostedPlatform = !!platform;
  const https = /^https:/i.test(finalUrl);
  const htmlSize = cleanHtml.length;

  const pageTitle = getTag(cleanHtml, 'title') || getMeta(cleanHtml, 'og:title') || '';
  const metaDesc = getMeta(cleanHtml, 'description') || getMeta(cleanHtml, 'og:description') || '';
  const h1Text = getTag(cleanHtml, 'h1') || '';
  const h1Count = (cleanHtml.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (cleanHtml.match(/<h2[\s>]/gi) || []).length;
  const imageCount = (cleanHtml.match(/<img[\s>]/gi) || []).length;
  const imageAltCount = (cleanHtml.match(/<img[^>]+alt=["'][^"']+["'][^>]*>/gi) || []).length;
  const imagesWithoutAlt = Math.max(0, imageCount - imageAltCount);
  const lazyImages = (cleanHtml.match(/loading=["']lazy["']/gi) || []).length;
  const formCount = (cleanHtml.match(/<form[\s>]/gi) || []).length;
  const buttonCount = (cleanHtml.match(/<button[\s>]/gi) || []).length;
  const linkCount = (cleanHtml.match(/<a[\s>]/gi) || []).length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(cleanHtml);
  const hasContact = /tel:|mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/i.test(cleanHtml);
  const hasPhone = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(cleanHtml) || /tel:/i.test(cleanHtml);
  const hasEmail = /mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(cleanHtml);
  const hasAddress = /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct|suite|ste)\b/i.test(cleanHtml) || /\b[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}\b/.test(cleanHtml);
  const hasGBP = /google\.com\/maps|maps\.google|g\.page|goo\.gl\/maps/i.test(cleanHtml);
  const hasHours = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(cleanHtml);
  const hasSocial = /instagram\.com|facebook\.com|tiktok\.com|twitter\.com|x\.com|linkedin\.com|yelp\.com\/biz/i.test(cleanHtml);
  const socialCount = ['instagram.com', 'facebook.com', 'tiktok.com', 'twitter.com', 'x.com', 'linkedin.com', 'yelp.com'].filter(s => lowerHtml.includes(s)).length;

  const hasBooking = hasAny(text, ['book now', 'book online', 'appointment', 'schedule', 'reserve', 'order now', 'request a quote', 'free consultation', 'consultation']);
  const hasReviews = hasAny(text, ['review', 'testimonial', 'stars', 'rating', 'google reviews', 'yelp', 'rated', 'happy clients', 'happy customers']);
  const hasPricing = hasAny(text, ['price', 'pricing', 'packages', 'rates', 'cost', 'starting at', '$']);
  const hasCTA = hasAny(text, ['contact', 'book', 'schedule', 'call', 'order', 'buy', 'start', 'get quote', 'reserve', 'sign up', 'get started', 'request']);
  const hasTrustSignals = hasAny(text, ['licensed', 'insured', 'certified', 'award', 'guarantee', 'trusted', 'years of experience', 'featured', 'verified', 'professional']);
  const hasClearOffer = hasAny(text, ['we help', 'specialize', 'services', 'solutions', 'done for you', 'for businesses', 'for local', 'increase', 'grow', 'save time']) || (h1Text.length >= 25 && h1Text.length <= 90);
  const hasServiceAreaKeywords = /\b(houston|dallas|austin|san antonio|texas|tx|near me|serving|service area|local|nearby|surrounding areas)\b/i.test(text);
  const hasAboveFoldCTA = hasCTA && cleanHtml.slice(0, Math.min(cleanHtml.length, 4500)).toLowerCase().match(/book|schedule|contact|call|get started|quote|consultation|start|request/);
  const weakHero = !h1Text || h1Text.length < 18 || !hasClearOffer || !hasAboveFoldCTA;
  const noClearNextStep = !hasCTA && !hasBooking && !hasContact && formCount === 0;

  const hasOG = getMeta(cleanHtml, 'og:title').length > 0 || getMeta(cleanHtml, 'og:image').length > 0;
  const hasOGImage = getMeta(cleanHtml, 'og:image').length > 0;
  const hasTwitterCard = /<meta[^>]+name=["']twitter:card["']/i.test(cleanHtml);
  const hasSchema = cleanHtml.includes('application/ld+json') || cleanHtml.includes('schema.org');
  const hasLocalSchema = /"@type"\s*:\s*"(LocalBusiness|Restaurant|HairSalon|BeautySalon|NailSalon|MedicalBusiness|Dentist|Store|ProfessionalService|HealthAndBeautyBusiness|DaySpa)"/i.test(cleanHtml);
  const hasFAQSchema = /"@type"\s*:\s*"FAQPage"/i.test(cleanHtml) || lowerHtml.includes('faqpage');
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(cleanHtml);
  const hasFavicon = /<link[^>]+rel=["'](?:icon|shortcut icon)["']/i.test(cleanHtml);
  const hasLangAttr = /<html[^>]+lang=/i.test(cleanHtml);
  const hasAnalytics = /google-analytics|gtag|googletagmanager|G-[A-Z0-9]+|UA-\d+|fbq\(|facebook\.com\/tr|hotjar|clarity\.ms/i.test(cleanHtml);
  const hasPixel = /fbq\(|facebook\.com\/tr|pintrk|ttq\.|snaptr/i.test(cleanHtml);
  const hasCookieConsent = /cookie.{0,20}consent|cookie.{0,20}policy|accept.{0,10}cookies|gdpr/i.test(cleanHtml);
  const hasBreadcrumb = /"@type"\s*:\s*"BreadcrumbList"/i.test(cleanHtml) || /breadcrumb/i.test(cleanHtml);
  const inlineStyles = (cleanHtml.match(/style=["']/gi) || []).length;
  const externalScripts = (cleanHtml.match(/<script[^>]+src=/gi) || []).length;
  const hasMixedContent = https && /<(?:img|script|link)[^>]+(?:src|href)=["']http:\/\//i.test(cleanHtml);

  const titleLen = pageTitle.length;
  const descLen = metaDesc.length;
  const hasTitle = titleLen > 0;
  const hasDescription = descLen > 0;

  const compression = headers.get('content-encoding') || '';
  const hasCaching = !!(headers.get('cache-control') || headers.get('expires'));
  const hasCompression = /gzip|br|deflate/i.test(compression);
  const pageSizeKB = Math.round(htmlSize / 1024);
  const loadSeconds = (loadMs / 1000).toFixed(1);

  // SITE AUDIT: stricter because the goal is lead generation, not just technical pass/fail.
  let auditScore = 100;
  if (!hasTitle) auditScore -= 12; else if (titleLen < 30 || titleLen > 60) auditScore -= 5;
  if (!hasDescription) auditScore -= 12; else if (descLen < 120 || descLen > 160) auditScore -= 4;
  if (h1Count === 0) auditScore -= 10; else if (h1Count > 1) auditScore -= 6;
  if (h2Count < 2) auditScore -= 3;
  if (!hasCanonical) auditScore -= 8;
  if (!hasSchema) auditScore -= 8;
  if (!hasLocalSchema && !isHostedPlatform) auditScore -= 8;
  if (!hasFAQSchema) auditScore -= 5;
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
  if (wordCount < 300) auditScore -= 10;
  if (weakHero) auditScore -= 8;
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

  // LOCAL SEO + CONVERSION: stricter because these are lead-killing gaps.
  let localScore = 100;
  if (!hasPhone) localScore -= 18;
  if (!hasAddress) localScore -= 16;
  if (!hasGBP) localScore -= 10;
  if (!hasHours) localScore -= 8;
  if (!hasReviews) localScore -= 12;
  if (!hasLocalSchema) localScore -= 16;
  if (!hasServiceAreaKeywords) localScore -= 12;
  if (!hasBooking) localScore -= 10;
  if (socialCount === 0) localScore -= 8; else if (socialCount < 2) localScore -= 4;
  if (!hasContact) localScore -= 10;
  localScore = Math.max(12, Math.min(97, localScore));

  // Growth score gives more weight to things that make visitors contact/book.
  let growthScore = 100;
  if (weakHero) growthScore -= 16;
  if (!hasClearOffer) growthScore -= 14;
  if (!hasAboveFoldCTA) growthScore -= 14;
  if (!hasContact) growthScore -= 18;
  if (!hasBooking) growthScore -= 12;
  if (!hasReviews) growthScore -= 10;
  if (!hasTrustSignals) growthScore -= 8;
  if (!hasPricing) growthScore -= 5;
  if (!hasFAQSchema) growthScore -= 5;
  if (noClearNextStep) growthScore -= 20;
  growthScore = Math.max(10, Math.min(98, growthScore));

  let score = Math.round(auditScore * 0.3 + perfScore * 0.2 + localScore * 0.25 + growthScore * 0.25);
  if (isHostedPlatform) score = Math.max(20, score - 6);
  score = Math.max(15, Math.min(96, score));

  const signals = {
    hasTitle, pageTitle, hasDescription, metaDescLen: descLen, titleLen,
    h1Text, h1Count, h2Count, imageCount, imageAltCount, imagesWithoutAlt, lazyImages,
    formCount, buttonCount, linkCount, wordCount,
    hasViewport, hasContact, hasPhone, hasEmail, hasBooking, hasReviews, hasPricing, hasCTA,
    hasTrustSignals, hasClearOffer, hasServiceAreaKeywords, hasAboveFoldCTA, weakHero, noClearNextStep,
    hasOG, hasOGImage, hasTwitterCard, hasSchema, hasLocalSchema, hasFAQSchema, hasCanonical,
    hasFavicon, hasLangAttr, hasAnalytics, hasPixel, hasCookieConsent, hasBreadcrumb,
    hasRobots, hasSitemap, hasCompression, hasCaching, hasMixedContent,
    https, isHostedPlatform, platform, score, auditScore, localScore, perfScore, growthScore,
    loadSeconds, pageSizeKB, externalScripts, socialCount, hasAddress, hasGBP, hasHours, hasSocial
  };

  return {
    url: finalUrl,
    score,
    auditScore,
    localScore,
    perfScore,
    growthScore,
    platform,
    grade: getGrade(score),
    pageTitle: pageTitle || new URL(finalUrl).hostname,
    summary: buildGrowthSummary(signals),
    leadLeakageSummary: buildLeadLeakageSummary(signals),
    recommendedPlan: buildRecommendedPlan(signals),
    solviahPitch: {
      headline: 'Your website may be getting traffic but still losing leads.',
      message: 'Solviah helps fix the gaps that stop visitors from calling, booking, trusting, or choosing your business online.',
      recommendedNextStep: 'Start with conversion copy, contact paths, booking CTAs, LocalBusiness schema, FAQ content, review sections, and trust signals.'
    },
    signals,
    audit: runAudit(signals),
    local: runLocal(signals),
    growth: runGrowthAudit(signals),
    competitor: buildCompetitor(url, signals, platform)
  };
}

function detectPlatform(url, html) {
  const u = url.toLowerCase();
  if (u.includes('styleseat.com')) return 'StyleSeat';
  if (u.includes('vagaro.com')) return 'Vagaro';
  if (u.includes('zoca.com')) return 'Zoca';
  if (u.includes('squareup.com') || u.includes('square.site')) return 'Square';
  if (u.includes('wix.com') || html.includes('wix.com/') || html.includes('_wixCssStates')) return 'Wix';
  if (u.includes('squarespace.com') || html.includes('static1.squarespace')) return 'Squarespace';
  if (u.includes('shopify') || html.includes('cdn.shopify.com')) return 'Shopify';
  if (u.includes('booksy.com')) return 'Booksy';
  if (u.includes('mindbodyonline.com')) return 'Mindbody';
  if (u.includes('fresha.com')) return 'Fresha';
  if (u.includes('yelp.com')) return 'Yelp';
  if (html.includes('/wp-content/') || html.includes('wp-json')) return 'WordPress';
  return null;
}

function getTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

function getMeta(html, name) {
  const pats = [
    new RegExp(`<meta[^>]+name=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegex(name)}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+property=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapeRegex(name)}["'][^>]*>`, 'i')
  ];

  for (const p of pats) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }

  return '';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAny(text, words) {
  const l = text.toLowerCase();
  return words.some(w => l.includes(w));
}

function makeIssue({ title, desc, severity = 'warning', why, fix, priority, solviahHelp, category = 'site' }) {
  const normalizedPriority = priority || severityToPriority(severity);

  return {
    title,
    desc,
    message: desc,
    severity,
    priority: normalizedPriority,
    category,
    why: why || desc,
    fix: fix || 'Review this item and update the page so visitors and search engines get a clearer experience.',
    solviahHelp: solviahHelp || 'Solviah can help fix this as part of a stronger conversion and SEO improvement plan.',
    status: 'failed'
  };
}

function makePass({ title, desc, category = 'site' }) {
  return {
    title,
    desc,
    message: desc,
    severity: 'passed',
    priority: 'None',
    category,
    status: 'passed'
  };
}

function severityToPriority(severity) {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'High';
  if (severity === 'info') return 'Medium';
  return 'Low';
}

function runAudit(s) {
  const issues = [];
  const passes = [];
  const add = (ok, pass, fail) => ok ? passes.push(makePass(pass)) : issues.push(makeIssue(fail));

  add(s.hasCanonical,
    { title: 'Canonical tag present', desc: 'Search engines know which version of this page to index.' },
    {
      title: 'Missing canonical tag',
      desc: 'Google may treat URL variations as duplicate pages, which can split ranking power.',
      severity: 'critical',
      why: 'Duplicate URL signals can weaken search visibility and make it harder for the right page to rank.',
      fix: 'Add a canonical link tag that points to the preferred version of the page.',
      solviahHelp: 'Solviah can clean up indexing signals so Google knows which page should rank.'
    });

  add(s.hasLocalSchema,
    { title: 'LocalBusiness schema found', desc: 'Google can better understand the business, location, and contact details.' },
    {
      title: 'No LocalBusiness structured data',
      desc: 'The site is missing structured data that helps Google understand local business details.',
      severity: 'critical',
      why: 'Without LocalBusiness schema, the business may miss local SEO visibility and rich search opportunities.',
      fix: 'Add JSON-LD LocalBusiness schema with name, URL, phone, service area, hours, and social links.',
      solviahHelp: 'Solviah can add LocalBusiness schema so the business is easier for Google to understand and display.'
    });

  add(s.hasFAQSchema,
    { title: 'FAQ schema found', desc: 'The page has structured FAQ content that can support search visibility.' },
    {
      title: 'Missing FAQ schema',
      desc: 'The page is missing structured FAQ content that answers buyer questions.',
      severity: 'warning',
      why: 'Visitors often need answers before they contact or book. Missing FAQs can leave objections unresolved.',
      fix: 'Add 4–6 helpful FAQs and mark them up with FAQPage JSON-LD schema.',
      solviahHelp: 'Solviah can write FAQ content that answers buyer objections and supports SEO.'
    });

  add(!s.hasMixedContent,
    { title: 'No mixed content', desc: 'All resources load securely over HTTPS.' },
    {
      title: 'Mixed content detected',
      desc: 'Some resources may load over insecure HTTP on an HTTPS page.',
      severity: 'critical',
      why: 'Browser warnings can damage trust and cause visitors to leave before contacting the business.',
      fix: 'Update all image, script, and stylesheet URLs to HTTPS.',
      solviahHelp: 'Solviah can clean up security and technical site issues that hurt trust.'
    });

  add(s.titleLen >= 30 && s.titleLen <= 60,
    { title: 'Title length optimized', desc: `${s.titleLen} characters, within the range Google typically displays.` },
    {
      title: s.titleLen === 0 ? 'Missing page title' : s.titleLen < 30 ? 'Title tag too short' : 'Title tag too long',
      desc: s.titleLen === 0 ? 'No title tag found.' : s.titleLen < 30 ? `Your title is only ${s.titleLen} characters.` : `Your title is ${s.titleLen} characters and may get cut off.`,
      severity: s.titleLen === 0 ? 'critical' : 'warning',
      why: 'The title tag is often the first thing people see in Google. Weak titles can lower clicks.',
      fix: 'Use a 30–60 character title with the main service, brand, and city or niche.',
      solviahHelp: 'Solviah can rewrite title tags to improve search clarity and click-through rate.'
    });

  add(s.metaDescLen >= 120 && s.metaDescLen <= 160,
    { title: 'Meta description optimized', desc: `${s.metaDescLen} characters, using the search snippet space well.` },
    {
      title: s.metaDescLen === 0 ? 'Missing meta description' : 'Meta description not optimized',
      desc: s.metaDescLen === 0 ? 'No meta description found. Google will auto-generate one.' : `Your description is ${s.metaDescLen} characters.`,
      severity: s.metaDescLen === 0 ? 'warning' : 'info',
      why: 'A weak or missing description can reduce clicks from people who are already searching.',
      fix: 'Add a 120–160 character description with the service, location/niche, benefit, and call-to-action.',
      solviahHelp: 'Solviah can write search snippets that make the business look more clickable and professional.'
    });

  add(s.hasSitemap,
    { title: 'Sitemap referenced', desc: 'Search engines can find and crawl the site pages.' },
    {
      title: 'No sitemap found',
      desc: 'A sitemap helps Google discover and index the website.',
      severity: 'warning',
      why: 'Important service pages may not get discovered quickly without a sitemap.',
      fix: 'Create a sitemap.xml and reference it inside robots.txt.',
      solviahHelp: 'Solviah can set up crawl-friendly SEO files so pages are easier to index.'
    });

  add(s.hasRobots,
    { title: 'robots.txt present', desc: 'The site gives search engines crawl instructions.' },
    {
      title: 'No robots.txt file',
      desc: 'A robots.txt file was not detected.',
      severity: 'warning',
      why: 'Search engines need crawl guidance, especially as the site grows.',
      fix: 'Add a robots.txt file and include a sitemap reference.',
      solviahHelp: 'Solviah can add technical SEO basics that improve crawl readiness.'
    });

  add(s.imagesWithoutAlt === 0,
    { title: 'All images have alt text', desc: `All ${s.imageCount} images appear to have alt text.` },
    {
      title: `${s.imagesWithoutAlt} images missing alt text`,
      desc: `${s.imagesWithoutAlt} of ${s.imageCount} images have no alt text.`,
      severity: 'warning',
      why: 'Missing alt text hurts accessibility and removes an opportunity to explain images to search engines.',
      fix: 'Add descriptive alt text to each important image.',
      solviahHelp: 'Solviah can optimize images for accessibility, SEO, and trust.'
    });

  add(s.hasOGImage,
    { title: 'Social share image set', desc: 'The page has an Open Graph image for better sharing previews.' },
    {
      title: 'No social share image',
      desc: 'The page may look plain or broken when shared online.',
      severity: 'warning',
      why: 'Poor social previews reduce trust when someone sends or shares the site.',
      fix: 'Add og:title, og:description, and og:image tags.',
      solviahHelp: 'Solviah can set up polished social previews that look professional when shared.'
    });

  add(s.wordCount >= 300,
    { title: 'Sufficient content depth', desc: `${s.wordCount} words, enough for a basic page scan.` },
    {
      title: 'Thin conversion copy',
      desc: `This page has about ${s.wordCount} words.`,
      severity: 'warning',
      why: 'Thin pages often fail to explain the offer, build trust, or answer buyer questions.',
      fix: 'Add clear sections for services, benefits, process, reviews, FAQs, and next steps.',
      solviahHelp: 'Solviah can rewrite the page into stronger sales-focused landing page copy.'
    });

  add(s.h1Count === 1,
    { title: 'Single H1 heading', desc: 'The page has one clear main heading.' },
    {
      title: s.h1Count === 0 ? 'No H1 heading' : `${s.h1Count} H1 headings found`,
      desc: s.h1Count === 0 ? 'No main headline found.' : 'Multiple H1 headings can confuse page focus.',
      severity: s.h1Count === 0 ? 'critical' : 'warning',
      why: 'A weak or missing main headline makes the offer less clear for visitors and search engines.',
      fix: 'Use one strong H1 that explains the service, audience, and outcome.',
      solviahHelp: 'Solviah can improve the hero headline so visitors understand the offer quickly.'
    });

  add(s.hasCTA,
    { title: 'Call-to-action present', desc: 'Visitors have a next step.' },
    {
      title: 'No clear call-to-action',
      desc: 'The page does not clearly guide visitors toward action.',
      severity: 'critical',
      why: 'Without a clear next step, visitors may leave even when they are interested.',
      fix: 'Add a strong CTA such as Book Now, Schedule a Consultation, Call Today, or Request a Quote.',
      solviahHelp: 'Solviah can improve CTA placement and page flow to increase leads.'
    });

  add(s.hasReviews,
    { title: 'Social proof present', desc: 'Reviews or testimonials are mentioned.' },
    {
      title: 'No reviews displayed',
      desc: 'The page does not show clear social proof.',
      severity: 'warning',
      why: 'People trust businesses faster when they can see proof from other customers.',
      fix: 'Add testimonials, review snippets, ratings, or client results near the offer.',
      solviahHelp: 'Solviah can add review sections that make the business feel safer to choose.'
    });

  add(s.hasCookieConsent || !s.hasAnalytics,
    { title: 'Privacy compliance looks okay', desc: 'Cookie and tracking setup does not show an obvious issue.' },
    {
      title: 'Tracking without cookie consent',
      desc: 'Analytics or pixels were detected without an obvious cookie consent notice.',
      severity: 'warning',
      why: 'Privacy expectations are increasing, and tracking without consent can create trust and compliance issues.',
      fix: 'Add a cookie notice or consent banner if using analytics, pixels, or remarketing tools.',
      solviahHelp: 'Solviah can help align tracking with a more professional trust experience.'
    });

  if (s.isHostedPlatform) {
    issues.unshift(makeIssue({
      title: `Hosted on ${s.platform}, limited technical control`,
      desc: `The site is on ${s.platform}, which may limit deeper technical SEO control.`,
      severity: 'warning',
      why: 'Hosted platforms can make it harder to control schema, speed, tracking, canonical tags, and conversion layout.',
      fix: 'Keep the platform if it works, but improve the parts you can control or move to a more flexible site when ready.',
      solviahHelp: 'Solviah can help decide whether to optimize the current platform or rebuild a higher-converting site.'
    }));
  }

  return { issues, passes };
}

function runGrowthAudit(s) {
  const issues = [];
  const passes = [];
  const add = (ok, pass, fail) => ok ? passes.push(makePass({ ...pass, category: 'growth' })) : issues.push(makeIssue({ ...fail, category: 'growth' }));

  add(!s.weakHero,
    { title: 'Hero section is clear', desc: 'The top of the page appears to explain the offer and guide visitors.' },
    {
      title: 'Weak hero section',
      desc: 'The top of the page may not clearly explain what the business offers or what visitors should do next.',
      severity: 'critical',
      why: 'Most visitors decide within seconds whether to stay. A weak hero section can lose leads before they scroll.',
      fix: 'Use a clear headline, short benefit statement, trust proof, and one strong CTA above the fold.',
      solviahHelp: 'Solviah can rewrite and restructure the hero section so visitors understand the value immediately.'
    });

  add(s.hasClearOffer,
    { title: 'Offer is clear', desc: 'The page gives signals about what the business provides.' },
    {
      title: 'Unclear offer',
      desc: 'The page does not clearly state the service, audience, and result.',
      severity: 'critical',
      why: 'If visitors cannot quickly tell what is being offered, they are less likely to contact or subscribe.',
      fix: 'Add a sentence like “We help [audience] get [result] with [service].”',
      solviahHelp: 'Solviah can sharpen the offer so the page speaks directly to the right customer.'
    });

  add(s.hasAboveFoldCTA,
    { title: 'Above-the-fold CTA found', desc: 'The top section appears to include a clear action.' },
    {
      title: 'Missing above-the-fold CTA',
      desc: 'The first screen does not appear to include a strong call-to-action.',
      severity: 'critical',
      why: 'Visitors should not have to hunt for how to book, call, or start.',
      fix: 'Add a primary CTA button in the header/hero and repeat it after key sections.',
      solviahHelp: 'Solviah can place CTAs where they naturally convert visitors into leads.'
    });

  add(s.hasContact,
    { title: 'Contact path exists', desc: 'The page includes at least one contact signal.' },
    {
      title: 'No phone, email, or clear contact path',
      desc: 'Visitors may not know how to reach the business.',
      severity: 'critical',
      why: 'This is one of the biggest lead leakage issues because ready-to-buy visitors cannot act quickly.',
      fix: 'Add phone, email, contact form, and/or contact button in the header, hero, and footer.',
      solviahHelp: 'Solviah can add contact paths that make it easier for visitors to become leads.'
    });

  add(s.hasBooking,
    { title: 'Booking/scheduling signal found', desc: 'The page encourages visitors to schedule, book, or request.' },
    {
      title: 'No booking signal',
      desc: 'The page does not clearly invite visitors to book or schedule.',
      severity: 'warning',
      why: 'A site can look nice but still fail if it does not push visitors toward a real action.',
      fix: 'Add “Book Now,” “Schedule a Consultation,” or “Request a Quote” buttons.',
      solviahHelp: 'Solviah can add booking flows and conversion sections that turn interest into action.'
    });

  add(s.hasServiceAreaKeywords,
    { title: 'Service-area keywords found', desc: 'The page includes local/location language.' },
    {
      title: 'Missing service-area or city keywords',
      desc: 'The page does not clearly mention a city, local area, or service area.',
      severity: 'warning',
      why: 'Local customers may not find the business if the site does not mention where it serves.',
      fix: 'Add city, state, service-area, and nearby-location wording naturally in the headline, body, footer, and metadata.',
      solviahHelp: 'Solviah can optimize local wording so nearby customers understand the business serves them.'
    });

  add(s.hasTrustSignals,
    { title: 'Trust signals found', desc: 'The page includes credibility language.' },
    {
      title: 'Missing trust signals',
      desc: 'The page does not show enough credibility markers.',
      severity: 'warning',
      why: 'Visitors are less likely to contact a business if they do not see proof, experience, or safety signals.',
      fix: 'Add certifications, years of experience, guarantees, client logos, media mentions, or proof points.',
      solviahHelp: 'Solviah can add trust-building sections that make visitors feel safer choosing the business.'
    });

  add(!s.noClearNextStep,
    { title: 'Next step is available', desc: 'Visitors have at least one path toward action.' },
    {
      title: 'No clear next step for visitors',
      desc: 'The page does not provide a strong path to call, book, contact, or start.',
      severity: 'critical',
      why: 'A visitor who is interested but confused will usually leave instead of trying to figure it out.',
      fix: 'Choose one primary action and make it visible throughout the page.',
      solviahHelp: 'Solviah can design the page journey so every section points toward a lead action.'
    });

  return { issues, passes };
}

function runLocal(s) {
  const checks = [];
  const issues = [];

  checks.push({ icon: '📞', title: 'Phone Number', desc: s.hasPhone ? 'Phone number detected on page.' : 'No phone number found.', status: s.hasPhone ? 'ok' : 'missing' });
  checks.push({ icon: '✉️', title: 'Email / Contact', desc: s.hasEmail || s.hasContact ? 'A contact path was detected.' : 'No clear email/contact path found.', status: s.hasEmail || s.hasContact ? 'ok' : 'missing' });
  checks.push({ icon: '📍', title: 'Physical Address / Service Area', desc: s.hasAddress || s.hasServiceAreaKeywords ? 'Address or service-area language detected.' : 'No address or service area found.', status: s.hasAddress || s.hasServiceAreaKeywords ? 'ok' : 'missing' });
  checks.push({ icon: '🗺️', title: 'Google Maps Link', desc: s.hasGBP ? 'Google Maps / Business Profile linked.' : 'No Google Maps link found.', status: s.hasGBP ? 'ok' : 'warn' });
  checks.push({ icon: '🕐', title: 'Business Hours', desc: s.hasHours ? 'Hours of operation listed.' : 'No business hours found.', status: s.hasHours ? 'ok' : 'warn' });
  checks.push({ icon: '⭐', title: 'LocalBusiness Schema', desc: s.hasLocalSchema ? 'Local schema found.' : 'No LocalBusiness schema markup.', status: s.hasLocalSchema ? 'ok' : 'missing' });
  checks.push({ icon: '📱', title: `Social Profiles (${s.socialCount})`, desc: s.socialCount >= 2 ? 'Multiple social profiles linked.' : s.socialCount === 1 ? 'Only one social profile linked.' : 'No social profiles linked.', status: s.socialCount >= 2 ? 'ok' : s.socialCount === 1 ? 'warn' : 'missing' });

  if (!s.hasLocalSchema) issues.push(makeIssue({
    title: 'Add LocalBusiness schema markup',
    desc: 'The site is missing one of the highest-impact local SEO signals.',
    severity: 'critical',
    category: 'local',
    why: 'LocalBusiness schema helps Google understand the business name, services, phone, hours, and service area.',
    fix: 'Add LocalBusiness JSON-LD with business name, URL, phone, address/service area, hours, and sameAs social links.',
    solviahHelp: 'Solviah can add the structured data that helps the business look more complete to search engines.'
  }));

  if (!s.hasPhone) issues.push(makeIssue({
    title: 'Add a click-to-call phone number',
    desc: 'No clear phone number was detected.',
    severity: 'critical',
    category: 'local',
    why: 'Mobile visitors often want to tap and call immediately. Missing phone info can lose ready leads.',
    fix: 'Add a visible phone number using a tel: link in the header, contact section, and footer.',
    solviahHelp: 'Solviah can add click-to-call contact paths so mobile visitors can reach the business faster.'
  }));

  if (!s.hasAddress && !s.hasServiceAreaKeywords) issues.push(makeIssue({
    title: 'Add consistent NAP or service-area details',
    desc: 'The page does not clearly show where the business operates.',
    severity: 'critical',
    category: 'local',
    why: 'Google and customers need location clarity before trusting a local business.',
    fix: 'Add the business name, address or service area, phone number, and city/state wording consistently.',
    solviahHelp: 'Solviah can optimize local business details so customers and Google know where the business serves.'
  }));

  if (!s.hasGBP) issues.push(makeIssue({
    title: 'Link your Google Business Profile',
    desc: 'No Google Maps or Business Profile link was found.',
    severity: 'warning',
    category: 'local',
    why: 'Connecting the site to Google Maps helps visitors verify the business and find reviews faster.',
    fix: 'Add a “Find us on Google” or map link near contact information.',
    solviahHelp: 'Solviah can connect website trust signals to the business’s Google presence.'
  }));

  if (!s.hasReviews) issues.push(makeIssue({
    title: 'Embed reviews and build review velocity',
    desc: 'No review/testimonial section was detected.',
    severity: 'warning',
    category: 'local',
    why: 'Reviews help undecided visitors trust the business and take action.',
    fix: 'Add Google reviews, testimonials, ratings, or short customer result cards.',
    solviahHelp: 'Solviah can build review sections that increase trust and conversions.'
  }));

  if (s.socialCount < 2) issues.push(makeIssue({
    title: 'Link more social profiles',
    desc: 'The page has limited social profile connections.',
    severity: 'info',
    category: 'local',
    why: 'Active social profiles can reinforce trust and help visitors verify the business.',
    fix: 'Link Instagram, Facebook, LinkedIn, TikTok, Yelp, or other relevant profiles.',
    solviahHelp: 'Solviah can add trust links and profile connections to make the business look more established.'
  }));

  return { checks, issues };
}

function buildCompetitor(url, s, platform) {
  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  const rows = [
    { name: 'SEO-optimized competitor', score: 88, mobile: true, seoTags: true, cta: true, reviews: true, isYou: false },
    { name: 'Top local competitor (avg)', score: 71, mobile: true, seoTags: true, cta: true, reviews: true, isYou: false },
    { name: 'Average local SMB', score: 52, mobile: true, seoTags: false, cta: false, reviews: false, isYou: false },
    { name: domain + (platform ? ` (${platform})` : ''), score: s.score, mobile: s.hasViewport, seoTags: s.hasTitle && s.hasDescription && s.hasCanonical, cta: s.hasCTA, reviews: s.hasReviews, isYou: true }
  ].sort((a, b) => b.score - a.score);

  let summary;

  if (s.score >= 85) {
    summary = `Your site scores ${s.score}, which is strong. The remaining opportunity is in the details that separate a good site from a lead-generating site: schema, conversion copy, trust signals, speed, and local SEO.`;
  } else if (s.score >= 65) {
    summary = `Your site scores ${s.score}, above the average local SMB, but still has a visible gap from top competitors. The fastest wins are clearer CTAs, stronger local signals, better schema, and more trust proof.`;
  } else {
    summary = `Your site scores ${s.score}, which means it likely has lead leakage. The good news is that many of the issues are fixable without a full rebuild: contact paths, booking CTAs, schema, reviews, and clearer copy.`;
  }

  return { rows, summary };
}

function getGrade(score) {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Needs improvement';
  if (score >= 55) return 'Lead leakage risk';
  return 'Critical growth gaps';
}

function buildGrowthSummary(s) {
  const gaps = [];

  if (!s.hasContact) gaps.push('no clear contact path');
  if (!s.hasBooking) gaps.push('no booking/scheduling signal');
  if (!s.hasLocalSchema) gaps.push('missing LocalBusiness schema');
  if (!s.hasReviews) gaps.push('missing reviews/social proof');
  if (s.weakHero) gaps.push('weak hero section');
  if (!s.hasServiceAreaKeywords) gaps.push('missing service-area keywords');

  if (gaps.length === 0) {
    return 'This site has a solid foundation. The next step is improving conversion copy, tracking, and technical SEO details that can help it compete at a higher level.';
  }

  return `This site may be losing leads because of ${gaps.slice(0, 4).join(', ')}${gaps.length > 4 ? ', and other growth gaps' : ''}. These are the types of issues that make visitors leave without calling, booking, or trusting the business.`;
}

function buildLeadLeakageSummary(s) {
  const items = [];

  if (!s.hasContact) items.push('Ready-to-buy visitors may not know how to contact the business.');
  if (!s.hasBooking) items.push('Interested visitors do not have a clear booking or scheduling path.');
  if (s.weakHero) items.push('The first screen may not explain the offer quickly enough.');
  if (!s.hasReviews) items.push('Visitors do not see enough social proof to feel confident.');
  if (!s.hasTrustSignals) items.push('The page needs more credibility markers.');
  if (!s.hasServiceAreaKeywords) items.push('Local searchers may not understand what area the business serves.');

  return items.length ? items : ['No major lead leakage warning was detected from this scan.'];
}

function buildRecommendedPlan(s) {
  const plan = [];

  if (!s.hasContact || !s.hasBooking || !s.hasAboveFoldCTA) {
    plan.push({
      title: 'Fix the conversion path first',
      action: 'Add a strong above-the-fold CTA, click-to-call/contact options, and a clear booking or consultation button.',
      impact: 'More visitors can turn into calls, bookings, or inquiries.'
    });
  }

  if (s.weakHero || !s.hasClearOffer || s.wordCount < 300) {
    plan.push({
      title: 'Rewrite the page for clarity',
      action: 'Improve the headline, offer statement, service benefits, process, FAQs, and closing CTA.',
      impact: 'Visitors understand the value faster and are more likely to take action.'
    });
  }

  if (!s.hasLocalSchema || !s.hasServiceAreaKeywords || !s.hasGBP) {
    plan.push({
      title: 'Strengthen local SEO',
      action: 'Add LocalBusiness schema, city/service-area keywords, Google Business Profile link, and consistent local details.',
      impact: 'Google and nearby customers can better understand where the business operates.'
    });
  }

  if (!s.hasReviews || !s.hasTrustSignals) {
    plan.push({
      title: 'Build trust proof',
      action: 'Add testimonials, reviews, credentials, guarantees, experience markers, and social links.',
      impact: 'Visitors feel safer choosing the business.'
    });
  }

  if (!s.hasCanonical || !s.hasSitemap || !s.hasRobots || !s.hasOGImage || !s.hasFAQSchema) {
    plan.push({
      title: 'Clean up technical SEO',
      action: 'Add canonical tags, sitemap/robots files, Open Graph tags, FAQ schema, and missing metadata.',
      impact: 'The site looks more professional to search engines and when shared.'
    });
  }

  return plan.length ? plan : [{
    title: 'Optimize and monitor',
    action: 'The site has a good foundation. Continue improving content, speed, tracking, and lead conversion.',
    impact: 'Small improvements can help the site compete with stronger local businesses.'
  }];
}
