# Ask.Veyza Owner Studio

The public website and owner project use the same repository. The owner project’s root redirects to `/owner`. The public homepage never displays private company records.

## Activate owner access

In Vercel → **askveyza-owner** → Settings → Environment Variables, add **OWNER_ACCESS_KEY** as a sensitive Production variable. Use a unique password-manager-generated key of at least 24 characters (maximum 512), then redeploy that project. Do not commit the key, put it in a URL, or paste it into chat. Open `https://askveyza-owner.vercel.app/owner` and unlock with that key.

Only this project needs the variable. The public project’s scanner stays disabled. A missing or short key fails closed. `/owner?demo=1` is an interactive fictional example; it never unlocks scanning and never saves company data.

## What works

- Add, edit, find, and switch between companies.
- Review a main page and up to three linked public service/contact/about/pricing/booking pages. Results include timestamps, source URLs, observed HTML signals, limitations, and failed-page notices.
- Keep up to 12 scan snapshots per company and compare the latest two. Signal counts are not SEO, ranking, or performance scores.
- Turn findings into actions; add due dates and update completion status.
- Enter monthly business totals and recorded marketing sources; build campaign links with UTM tags.
- Compare manually entered conversion/capacity/cost scenarios. Unknown inputs stay unknown.
- Keep owner and competitor research notes; copy a reviewable company brief. No outreach is sent.
- Export an encrypted backup; import additional companies without overwriting existing company IDs.

## Storage and privacy

This release uses **encrypted browser storage, not cloud sync**. Records are local to the browser profile and website origin. Changing device, browser, or domain will not transfer them. Export backups regularly, especially before clearing site data. The old owner page’s local records are not silently replaced or imported.

The access key also derives the local encryption key using PBKDF2-SHA256 (600,000 iterations), a per-workspace random salt, and AES-256-GCM with a fresh nonce per save. Keep the original key with your backups. Changing the Vercel key does not re-encrypt old records: first export a backup, keep its old key, and import it into a fresh browser workspace using that original key. There is no recovery service for a lost key.

Authentication uses an HttpOnly, Secure, SameSite=Strict signed session cookie, with four-hour expiry and origin checks for state-changing requests. The UI locks after 15 minutes of inactivity. Credentials are never stored in localStorage. Scanning requires server-side authentication even if someone downloads the static UI files. An additional per-instance throttle limits login and scan attempts; it is not a distributed rate limiter. The long random key is required. Add platform rate limits if exposed to substantial traffic.

## Scanner limits

Public HTTP/HTTPS only, standard ports, no credentials or IP-literal URLs. DNS answers are restricted to public IPv4 and pinned to the outgoing connection; each redirect is validated. Private, loopback, link-local, reserved, and unsupported addresses are rejected. Redirects, response sizes, and request duration are bounded. Sites using only IPv6, requiring JavaScript rendering, or blocking automated access may need manual review.

This is a best-effort HTML review. It does not sign into accounts, measure search rankings, verify form submissions, render mobile layouts, run Lighthouse, or discover actual traffic/sales. A detected analytics script does not prove that tracking is configured correctly. Missing HTML signals may be present on another page or rendered with JavaScript. No competitor benchmarks or sales claims are fabricated.

## Local development

Run `npm install`, supply `OWNER_ACCESS_KEY` in your local environment, and run `npm start`. Open `http://localhost:5500/owner`. The server and Vercel functions share the same scan/authentication implementation. Use `npm test` for the core regression tests.

Deployment through the GitHub `main` branch updates the connected Vercel projects. No new paid service or Supabase project is required. Actual analytics/social/booking integrations remain a separate implementation; the dashboard labels them as not connected.
