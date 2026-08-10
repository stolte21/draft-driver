# SEO & Discoverability Design

**Date:** 2026-08-10
**Goal:** Make Draft Driver findable and well-represented in Google and LLM
assistants (ChatGPT, Claude, Perplexity). Not competing for generic fantasy
football search traffic — the target is that people who search for the tool by
name (or ask an LLM for fantasy draft tools) find it, get a rich preview, and
get an accurate description of what it does.

**Canonical URL:** `https://draft-driver.vercel.app` (staying on the Vercel
subdomain; no custom domain for now).

## Problem

The live site currently ships almost nothing for crawlers:

- Only a `<title>`, a one-line meta description, and a viewport tag.
- No Open Graph / Twitter Card tags and no OG image — shared links show a bare
  URL.
- No JSON-LD structured data.
- `robots.txt` and `sitemap.xml` both 404.
- No canonical URLs, no `lang` attribute, no apple-touch-icon.
- All content is client-rendered; the HTML body is an empty app shell. LLM
  crawlers (GPTBot, ClaudeBot, PerplexityBot) mostly don't execute JS, so they
  see effectively nothing.
- `/depth-charts` reuses the homepage title/description.
- Viewport tag sets `maximum-scale=1`, blocking pinch-zoom (accessibility
  flag).
- Off-site: GitHub repo has an empty description; README still describes the
  removed FantasyPros scraping instead of Boris Chen + Sleeper.

## Design

### 1. Metadata infrastructure

**`utils/site.ts`** (new): exports `SITE_URL = 'https://draft-driver.vercel.app'`
and the default site name/description — single source of truth used by
canonical tags, OG tags, JSON-LD, and any future sitemap generation.

**`components/Page.tsx`:** extend the `Meta` type and `<Head>` block to render:

- Canonical: `SITE_URL + router.pathname` (homepage normalizes to `SITE_URL + '/'`).
- Open Graph: `og:title`, `og:description`, `og:url`, `og:image`
  (`${SITE_URL}/og.png`), `og:type` = `website`, `og:site_name` = `Draft Driver`.
- Twitter: `twitter:card` = `summary_large_image`, `twitter:title`,
  `twitter:description`, `twitter:image`.
- Viewport without `maximum-scale=1`.

New default description:

> Free fantasy football draft tool with tier-based rankings from Boris Chen,
> Sleeper projections and ADP, roster tracking, and scarcity-adjusted
> rankings. Works for PPR, half-PPR, and standard leagues.

**`pages/_document.tsx`:** `<Html lang="en">`, `apple-touch-icon` link,
`theme-color` meta.

**Per-page meta:** `/depth-charts` and the new `/about` pass unique
`meta.title` / `meta.description` to `Page`.

### 2. Structured data (JSON-LD)

**`components/JsonLd.tsx`** (new): tiny component rendering
`<script type="application/ld+json">` with a serialized object, placed inside
`next/head`.

- **Homepage:** `WebApplication` — name, url, description,
  `applicationCategory: 'SportsApplication'`, `operatingSystem: 'Web'`,
  `offers: { '@type': 'Offer', price: '0' }`, `screenshot`.
- **/about:** `FAQPage`. The FAQ content lives in one exported array of
  `{ question, answer }` objects that drives both the visible FAQ HTML and the
  JSON-LD, so markup and visible content cannot drift (Google penalizes
  mismatches).

### 3. Crawl files (static, in `public/`)

- **`robots.txt`:** `User-agent: *` / `Allow: /`, plus explicit allow stanzas
  for GPTBot, ClaudeBot, Claude-Web, PerplexityBot, and Google-Extended;
  `Sitemap: https://draft-driver.vercel.app/sitemap.xml`.
- **`sitemap.xml`:** static file listing `/`, `/about`, `/depth-charts`.
  Three rarely-changing pages don't justify a generated route.
- **`llms.txt`:** markdown summary — what Draft Driver is, feature list, data
  sources (Boris Chen tiers, Sleeper projections/ADP), link to `/about` and
  the GitHub repo.

### 4. `/about` page (`pages/about.tsx`)

Statically pre-rendered (pages-router default; Chakra/emotion SSRs styles so
the prose is in the initial HTML response). This is the page LLMs and Google
can actually read and cite.

Content (~500 words, real `<h1>`/`<h2>` hierarchy):

1. What Draft Driver is (2–3 paragraphs).
2. Feature list (search/filtering, favorites/avoids, notes, keepers, roster
   tracking, scarcity-adjusted VORP rankings, injury indicators, light/dark
   mode, mobile support, localStorage persistence).
3. How the data works: Boris Chen tier-based rankings merged with Sleeper API
   season projections, ADP, teams, rookie/injury status.
4. FAQ (~6 items): Is it free? Which scoring formats? How fresh is the data?
   Does it work on mobile? Do I need an account? Where is my draft data
   stored?

Layout: existing `AppBar` + `Page` components, normal scrollable page, link
back to the draft board. Discoverable in-app via a "Learn more" link added to
the existing About modal.

### 5. OG image & icons

- **`public/og.png`** (1200×630): app name, tagline, draft-board screenshot on
  a brand-colored background. Built once from an HTML template +
  screenshot, committed as a static asset.
- **`public/apple-touch-icon.png`** (180×180) derived from the favicon
  artwork.

### 6. Off-site signals

- `gh repo edit`: set repo description and website field to the live URL.
- Rewrite `README.md`: live URL prominently at top, current data-source
  description (Boris Chen + Sleeper, not FantasyPros), current feature list.
  GitHub READMEs are heavily weighted in LLM training data.

## Error handling

Nothing here has meaningful runtime failure modes — all additions are static
tags, static files, and a static page. The only care points:

- JSON-LD must be valid JSON (serialized from objects, not hand-written
  strings).
- Canonical/OG URLs must not double-slash or include query strings.

## Testing & verification

- Existing unit tests must keep passing (`npm test`); no reducer/logic
  changes expected.
- `npm run build` + local prod server: `curl` raw HTML and assert canonical,
  OG, Twitter, and JSON-LD tags present; `/about` prose present without JS;
  `robots.txt`, `sitemap.xml`, `llms.txt` return 200.
- Validate `WebApplication` and `FAQPage` JSON-LD against schema.org / Google
  Rich Results rules.
- After deploy: verify the same on the live URL; user submits the sitemap in
  Google Search Console (needs their Google account — include instructions in
  the PR description).

## Out of scope

- SSR/ISR of live rankings data (serves the "compete for search traffic" goal
  that was explicitly not chosen).
- Custom domain migration (revisit later; `SITE_URL` constant makes it a
  one-line change plus redirects).
- Blog/content marketing, analytics, Core Web Vitals work.
