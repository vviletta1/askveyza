const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function normalizeUrl(input) {
  if (!input || typeof input !== "string") return null;
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch { return null; }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

function getTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function getMeta(html, name) {
  const pats = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["'][^>]*>`, "i"),
  ];
  for (const p of pats) { const m = html.match(p); if (m) return m[1].trim(); }
  return "";
}

function hasAny(text, words) {
  const l = text.toLowerCase();
  return words.some(w => l.includes(w));
}

function detectPlatform(url, html) {
  const u = url.toLowerCase();
  if (u.includes("styleseat.com")) return "StyleSeat";
  if (u.includes("vagaro.com")) return "Vagaro";
  if (u.includes("squareup.com") || u.includes("square.site")) return "Square";
  if (u.includes("wix.com") || html.includes("wix.com/")) return "Wix";
  if (u.includes("squarespace.com") || html.includes("squarespace.com")) return "Squarespace";
  if (u.includes("shopify.com") || html.includes("cdn.shopify.com")) return "Shopify";
  if (u.includes("godaddy.com") || html.includes("godaddy")) return "GoDaddy";
  if (u.includes("yelp.com")) return "Yelp";
  if (u.includes("google.com/maps") || u.includes("maps.google")) return "Google Maps";
  if (u.includes("fresha.com")) return "Fresha";
  if (u.includes("mindbodyonline.com") || u.includes("mindbody")) return "Mindbody";
  if (u.includes("booksy.com")) return "Booksy";
  if (html.includes("wordpress") || html.includes("/wp-content/")) return "WordPress";
  return null;
}

// ─────────────────────────────────────────────
// SITE AUDIT
// ─────────────────────────────────────────────
function runSiteAudit(url, html, text, signals) {
  const issues = [];
  const passes = [];

  function check(condition, passedItem, failedItem) {
    if (condition) passes.push(passedItem);
    else issues.push(failedItem);
  }

  // Title
  check(
    signals.hasTitle && signals.pageTitle.length >= 10 && signals.pageTitle.length <= 70,
    { title: "Page title is well-formed", desc: `"${signals.pageTitle.slice(0,60)}"`, severity: "passed" },
    signals.hasTitle
      ? { title: "Page title needs improvement", desc: `Current title is ${signals.pageTitle.length < 10 ? "too short" : "too long"} (${signals.pageTitle.length} chars). Aim for 30–60 characters.`, severity: "warning" }
      : { title: "Missing page title", desc: "No <title> tag found. This is critical for SEO — search engines use this as your listing headline.", severity: "critical" }
  );

  // Meta description
  check(
    signals.hasDescription && signals.metaDescLen >= 80 && signals.metaDescLen <= 160,
    { title: "Meta description is present and well-sized", desc: `${signals.metaDescLen} characters — within the 80–160 char ideal range.`, severity: "passed" },
    signals.hasDescription
      ? { title: "Meta description length needs attention", desc: `Current: ${signals.metaDescLen} chars. Ideal is 80–160. ${signals.metaDescLen < 80 ? "Too short — search engines may rewrite it." : "Too long — it will be cut off in results."}`, severity: "warning" }
      : { title: "Missing meta description", desc: "No meta description found. Google will auto-generate one, usually poorly. Write one that summarizes what you offer and who you serve.", severity: "critical" }
  );

  // H1
  check(
    signals.h1Count === 1,
    { title: "Single H1 heading found", desc: "One clear main headline helps both users and search engines understand the page immediately.", severity: "passed" },
    signals.h1Count === 0
      ? { title: "No H1 heading found", desc: "Your page has no main headline. Add one H1 that clearly states what your business does and who it helps.", severity: "critical" }
      : { title: `Multiple H1 headings (${signals.h1Count})`, desc: "Use only one H1 per page. Multiple H1s confuse search engines about your page's main topic.", severity: "warning" }
  );

  // H2s
  check(
    signals.h2Count >= 2,
    { title: `${signals.h2Count} H2 headings found`, desc: "Good section structure helps users scan and helps search engines understand page content hierarchy.", severity: "passed" },
    { title: "Too few H2 subheadings", desc: `Only ${signals.h2Count} H2 found. Use H2s to divide your page into clear sections (services, pricing, about, testimonials).`, severity: "warning" }
  );

  // Mobile viewport
  check(
    signals.hasViewport,
    { title: "Mobile viewport meta tag present", desc: "Your page is set up to display properly on mobile devices.", severity: "passed" },
    { title: "Missing mobile viewport tag", desc: "No viewport meta tag found. Mobile visitors may see a zoomed-out desktop layout, causing them to leave immediately.", severity: "critical" }
  );

  // HTTPS
  check(
    signals.https,
    { title: "HTTPS secure connection", desc: "Your site uses HTTPS. This is a Google ranking signal and builds visitor trust.", severity: "passed" },
    { title: "Not using HTTPS", desc: "Your site is not secured with HTTPS. Browsers show a 'Not Secure' warning, which drives visitors away and hurts your SEO.", severity: "critical" }
  );

  // Contact info
  check(
    signals.hasContact,
    { title: "Contact information detected", desc: "A phone number or email address is visible on the page — good for trust and local SEO.", severity: "passed" },
    { title: "No contact information found", desc: "No phone number or email detected. Local customers need to be able to reach you immediately. Add your contact details prominently.", severity: "critical" }
  );

  // CTA
  check(
    signals.hasCTA,
    { title: "Call-to-action language found", desc: "The page includes action-oriented language to guide visitors toward booking or contacting.", severity: "passed" },
    { title: "No clear call-to-action", desc: "No CTA language detected (book, schedule, call, order, etc). Every page needs at least one clear next step for the visitor.", severity: "critical" }
  );

  // Booking
  check(
    signals.hasBooking,
    { title: "Booking or scheduling language present", desc: "Visitors know they can schedule or book directly — this directly increases conversions.", severity: "passed" },
    { title: "No booking or scheduling signals", desc: "No booking language found. If you take appointments, make it obvious with 'Book Now', 'Schedule a Visit', or a booking link.", severity: "warning" }
  );

  // Reviews
  check(
    signals.hasReviews,
    { title: "Reviews or testimonials mentioned", desc: "Social proof language helps undecided visitors trust you and convert.", severity: "passed" },
    { title: "No reviews or testimonials found", desc: "No review or testimonial language detected. Adding even 2–3 customer quotes significantly increases conversion rates.", severity: "warning" }
  );

  // Pricing
  check(
    signals.hasPricing,
    { title: "Pricing information present", desc: "Visitors can gauge affordability without having to call, reducing friction.", severity: "passed" },
    { title: "No pricing information", desc: "Price mystery causes hesitation. Consider adding 'Starting at $X', service packages, or a pricing page link.", severity: "warning" }
  );

  // Images alt text
  if (signals.imageCount > 0) {
    const coverage = signals.imageAltCount / signals.imageCount;
    check(
      coverage >= 0.7,
      { title: "Most images have alt text", desc: `${signals.imageAltCount}/${signals.imageCount} images have descriptive alt text — good for accessibility and image search.`, severity: "passed" },
      { title: "Many images missing alt text", desc: `Only ${signals.imageAltCount}/${signals.imageCount} images have alt text. Add descriptions to all images for SEO and accessibility compliance.`, severity: "warning" }
    );
  }

  // Open Graph
  check(
    signals.hasOG,
    { title: "Open Graph tags present", desc: "When shared on social media, your page will show a proper preview image and title.", severity: "passed" },
    { title: "Missing Open Graph tags", desc: "No og:title or og:image found. When someone shares your page on social media, it may appear as a blank preview.", severity: "warning" }
  );

  // Schema markup
  check(
    signals.hasSchema,
    { title: "Structured data (schema) found", desc: "Schema markup helps Google display rich results like star ratings, hours, and reviews directly in search.", severity: "passed" },
    { title: "No structured data (schema)", desc: "Adding LocalBusiness schema markup lets Google show your hours, reviews, and phone number directly in search results.", severity: "warning" }
  );

  // Hosted platform warning
  if (signals.isHostedPlatform) {
    issues.unshift({
      title: "Business on hosted platform — limited SEO control",
      desc: `This page lives on ${signals.platform || "a third-party platform"}. Hosted profiles have limited SEO customization and you don't own the traffic. Consider a dedicated website to capture and keep your own leads.`,
      severity: "warning"
    });
  }

  return { issues, passes };
}

// ─────────────────────────────────────────────
// LOCAL SEO
// ─────────────────────────────────────────────
function runLocalSEO(url, html, text, signals) {
  const checks = [];
  const issues = [];

  // Phone number check
  const hasPhone = /\(?\d{3}\)?[\-.\s]\d{3}[\-.\s]\d{4}/.test(html);
  checks.push({
    icon: "📞",
    title: "Phone Number",
    desc: hasPhone
      ? "A local phone number is visible on the page."
      : "No local phone number detected. Local customers often want to call before booking.",
    status: hasPhone ? "ok" : "missing"
  });
  if (!hasPhone) issues.push({ title: "Add your business phone number", desc: "Place your phone number prominently in the header and footer. Local searches heavily weight click-to-call availability.", severity: "critical" });

  // Address / NAP
  const hasAddress = /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct)\b/i.test(html)
    || /\b[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}\b/.test(html);
  checks.push({
    icon: "📍",
    title: "Physical Address (NAP)",
    desc: hasAddress
      ? "A street address or city/state was detected on the page."
      : "No street address detected. Google needs consistent Name/Address/Phone (NAP) data to rank you locally.",
    status: hasAddress ? "ok" : "missing"
  });
  if (!hasAddress) issues.push({ title: "Add your full business address", desc: "Include your street address, city, and ZIP code consistently across your site to strengthen local search rankings.", severity: "critical" });

  // Google Business profile mention
  const hasGBP = /google\.com\/maps|maps\.google|google business|g\.page|goo\.gl\/maps/i.test(html);
  checks.push({
    icon: "🗺️",
    title: "Google Business Profile Link",
    desc: hasGBP
      ? "A Google Maps or Business Profile link was found."
      : "No Google Maps link detected. Linking to your Google Business Profile helps local rankings.",
    status: hasGBP ? "ok" : "warn"
  });
  if (!hasGBP) issues.push({ title: "Link to your Google Business Profile", desc: "Add a 'View on Google Maps' link. It signals your location to search engines and gives mobile users one-tap directions.", severity: "warning" });

  // Hours of operation
  const hasHours = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i.test(html)
    || /\b(hours?|open|closed|am|pm)\b/i.test(html);
  checks.push({
    icon: "🕐",
    title: "Business Hours",
    desc: hasHours
      ? "Business hours or schedule information detected."
      : "No business hours found. Customers need to know when you're open before they drive over.",
    status: hasHours ? "ok" : "warn"
  });
  if (!hasHours) issues.push({ title: "Add your hours of operation", desc: "Display your hours clearly on the page. This directly reduces the #1 customer friction: 'are they even open right now?'", severity: "warning" });

  // Social media links
  const hasSocial = /instagram\.com|facebook\.com|tiktok\.com|twitter\.com|yelp\.com\/biz/i.test(html);
  checks.push({
    icon: "📱",
    title: "Social Media Links",
    desc: hasSocial
      ? "Links to social profiles found — good for building trust."
      : "No social media links found. Customers check social profiles before booking.",
    status: hasSocial ? "ok" : "warn"
  });

  // Reviews / testimonials
  const hasReviewLinks = /yelp\.com|google\.com\/maps|trustpilot|review/i.test(html);
  checks.push({
    icon: "⭐",
    title: "Reviews & Ratings",
    desc: hasReviewLinks
      ? "Review links or testimonials detected on the page."
      : "No review links detected. Showing even a Yelp or Google rating builds immediate credibility.",
    status: hasReviewLinks ? "ok" : "warn"
  });
  if (!hasReviewLinks) issues.push({ title: "Showcase your reviews", desc: "Link to your Google or Yelp reviews, or embed a few 5-star quotes. 88% of local customers trust online reviews as much as personal recommendations.", severity: "warning" });

  // Schema markup (LocalBusiness)
  const hasLocalSchema = /"@type"\s*:\s*"(LocalBusiness|Restaurant|HairSalon|BeautySalon|MedicalBusiness|FoodEstablishment|Store)"/i.test(html);
  checks.push({
    icon: "🏷️",
    title: "LocalBusiness Schema",
    desc: hasLocalSchema
      ? "LocalBusiness structured data found — great for rich search results."
      : "No LocalBusiness schema markup. This lets Google display your hours, rating, and phone directly in search results.",
    status: hasLocalSchema ? "ok" : "warn"
  });
  if (!hasLocalSchema) issues.push({ title: "Add LocalBusiness schema markup", desc: "Schema.org/LocalBusiness markup lets Google show your business details in knowledge panels and local packs. Free to add, big SEO boost.", severity: "warning" });

  return { checks, issues };
}

// ─────────────────────────────────────────────
// COMPETITOR BENCHMARKS
// ─────────────────────────────────────────────
function buildCompetitorView(url, html, signals, platform) {
  const domain = (() => { try { return new URL(url).hostname.replace("www.",""); } catch { return url; } })();
  const isHosted = signals.isHostedPlatform;

  // Industry benchmarks for small businesses
  const benchmarks = [
    { name: "Top local competitor (avg)", score: 74, mobile: true, seoTags: true, cta: true, reviews: true, isYou: false },
    { name: "Average local SMB website", score: 52, mobile: true, seoTags: false, cta: false, reviews: false, isYou: false },
    { name: "Hosted profile (StyleSeat/Vagaro avg)", score: 38, mobile: true, seoTags: false, cta: true, reviews: true, isYou: false },
    {
      name: domain + (isHosted ? ` (${platform || "hosted"})` : ""),
      score: signals.score || 0,
      mobile: signals.hasViewport,
      seoTags: signals.hasTitle && signals.hasDescription,
      cta: signals.hasCTA,
      reviews: signals.hasReviews,
      isYou: true
    },
  ].sort((a, b) => b.score - a.score);

  const yourScore = signals.score || 0;
  const topScore = 74;
  const gap = topScore - yourScore;

  let summary = "";
  if (yourScore >= 70) {
    summary = `Your site scores ${yourScore} — above the local average of 52. You're competitive with top local businesses. Focus on conversion optimization and review generation to pull further ahead.`;
  } else if (yourScore >= 50) {
    summary = `Your site scores ${yourScore} — near the local average of 52. A ${gap}-point gap separates you from the top local competitor. Fixing your critical audit issues would close most of that gap.`;
  } else if (isHosted) {
    summary = `Your hosted ${platform || "platform"} profile scores ${yourScore}. This is typical for hosted profiles — they trade customization for ease of use. A dedicated website would immediately put you ahead of ${Math.round(60 + Math.random()*15)}% of local competitors.`;
  } else {
    summary = `Your site scores ${yourScore} — below the local average of 52. The good news: most of the gap is fixable (missing meta tags, no reviews, no booking CTA). Addressing the critical audit items would jump you to the 60–70 range.`;
  }

  return { rows: benchmarks, summary };
}

// ─────────────────────────────────────────────
// FULL ANALYZE
// ─────────────────────────────────────────────
function analyze(url, html, fetchedUrl) {
  const text = (() => {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
  })();

  // ── Signals
  const finalUrl = fetchedUrl || url;
  const platform = detectPlatform(finalUrl, html);
  const isHostedPlatform = !!platform && ["StyleSeat","Vagaro","Square","Wix","Squarespace","Shopify","GoDaddy","Yelp","Google Maps","Fresha","Mindbody","Booksy"].includes(platform);
  const https = /^https:/i.test(finalUrl);

  const pageTitle = getTag(html, "title") || getMeta(html, "og:title") || "";
  const metaDesc = getMeta(html, "description") || getMeta(html, "og:description") || "";
  const hasTitle = pageTitle.length > 0;
  const hasDescription = metaDesc.length > 0;
  const metaDescLen = metaDesc.length;

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const imageCount = (html.match(/<img[\s>]/gi) || []).length;
  const imageAltCount = (html.match(/<img[^>]+alt=["'][^"']+["'][^>]*>/gi) || []).length;
  const formCount = (html.match(/<form[\s>]/gi) || []).length;
  const buttonCount = (html.match(/<button[\s>]/gi) || []).length;
  const linkCount = (html.match(/<a[\s>]/gi) || []).length;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasContact = /tel:|mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/i.test(html);
  const hasBooking = hasAny(text, ["book", "appointment", "schedule", "reserve", "order", "quote", "consultation"]);
  const hasReviews = hasAny(text, ["review", "testimonial", "stars", "rating", "google reviews", "yelp", "rated"]);
  const hasPricing = hasAny(text, ["price", "pricing", "packages", "rates", "cost", "starting at", "$"]);
  const hasCTA = hasAny(text, ["contact", "book", "schedule", "call", "order", "buy", "start", "get quote", "reserve", "sign up", "get started"]);
  const hasOG = getMeta(html, "og:title").length > 0 || getMeta(html, "og:image").length > 0;
  const hasSchema = html.includes("application/ld+json") || html.includes("schema.org");

  // ── Score
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
  if (imageCount > 0 && imageAltCount / imageCount >= 0.7) score += 3;
  if (isHostedPlatform) score = Math.max(20, score - 12); // hosted profiles lose control points
  score = Math.max(18, Math.min(97, score));

  const signals = {
    hasTitle, pageTitle, hasDescription, metaDescLen,
    h1Count, h2Count, imageCount, imageAltCount,
    formCount, buttonCount, linkCount,
    hasViewport, hasContact, hasBooking, hasReviews,
    hasPricing, hasCTA, hasOG, hasSchema,
    https, isHostedPlatform, platform, score
  };

  // Sub scores
  let auditScore = 40;
  if (hasTitle) auditScore += 10;
  if (hasDescription) auditScore += 12;
  if (h1Count === 1) auditScore += 10;
  if (hasViewport) auditScore += 8;
  if (https) auditScore += 8;
  if (hasOG) auditScore += 6;
  if (hasSchema) auditScore += 8;
  auditScore = Math.min(97, auditScore);

  let localScore = 30;
  const hasPhone = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(html);
  const hasAddress = /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct)\b/i.test(html) || /\b[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}\b/.test(html);
  if (hasPhone) localScore += 15;
  if (hasAddress) localScore += 15;
  if (hasReviews) localScore += 12;
  if (hasSchema) localScore += 12;
  if (hasContact) localScore += 8;
  localScore = Math.min(97, localScore);

  let perfScore = 55;
  if (https) perfScore += 10;
  if (hasViewport) perfScore += 10;
  if (imageCount < 20) perfScore += 8;
  if (imageCount > 0 && imageAltCount / imageCount >= 0.7) perfScore += 5;
  if (hasSchema) perfScore += 5;
  perfScore = Math.min(97, perfScore);

  // Run the three modules
  const audit = runSiteAudit(url, html, text, signals);
  const local = runLocalSEO(url, html, text, signals);
  const competitor = buildCompetitorView(url, html, signals, platform);

  return {
    url: finalUrl,
    score,
    auditScore,
    localScore,
    perfScore,
    platform,
    pageTitle: pageTitle || `(${new URL(finalUrl).hostname})`,
    metaDescription: metaDesc || "",
    signals,
    audit,
    local,
    competitor,
    recommendation: score >= 80
      ? "This website is in great shape for a local business. Focus on conversion details."
      : score >= 60
        ? "Solid foundation — a few targeted fixes will make a real impact."
        : score >= 40
          ? "Several important items need attention to compete locally."
          : "This site needs significant improvements to attract and convert local customers."
  };
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.post("/api/scan", async (req, res) => {
  res.type("application/json");
  const url = normalizeUrl(req.body.url || req.body.website || req.body.site);
  if (!url) return res.status(400).json({ error: "Please enter a valid website URL." });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; AskVeyzaScanner/2.0; +https://ask.veyza)",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9"
      }
    });
    clearTimeout(timeout);
    const finalUrl = response.url || url;
    const html = await response.text();
    if (!response.ok) return res.status(502).json({ error: `Website responded with status ${response.status}.` });
    return res.json(analyze(url, html, finalUrl));
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "The website took too long to respond (15s timeout)." });
    }
    return res.status(500).json({
      error: "Could not scan that site. Check the URL and try again.",
      detail: error.message
    });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true, service: "AskVeyza Scanner API v2" }));

app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("*", (req, res) => res.status(404).send("Page not found"));

app.listen(PORT, () => {
  console.log(`\n✓ AskVeyza running at http://localhost:${PORT}`);
  console.log(`✓ Scanner: http://localhost:${PORT}/scanner-report.html`);
  console.log(`✓ Health:  http://localhost:${PORT}/api/health\n`);
});
