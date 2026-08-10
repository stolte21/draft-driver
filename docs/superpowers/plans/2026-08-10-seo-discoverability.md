# SEO & Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Draft Driver findable and well-represented in Google and LLM assistants — full metadata/OG/JSON-LD, crawl files, and a server-rendered `/about` page.

**Architecture:** A `utils/site.ts` constants module is the single source of truth for URLs/descriptions. `components/Page.tsx` renders canonical/OG/Twitter tags for every page. JSON-LD schemas are built by pure functions in `utils/structuredData.ts` (unit-tested) and rendered by a tiny `JsonLd` component. Crawl files are static assets in `public/`. `/about` is a statically pre-rendered pages-router page whose FAQ content drives both visible HTML and `FAQPage` JSON-LD from one array.

**Tech Stack:** Next.js 15 (pages router), Chakra UI, Vitest. Spec: `docs/superpowers/specs/2026-08-10-seo-discoverability-design.md`.

**Conventions:** Imports use tsconfig `baseUrl: "."` style (`import Page from 'components/Page'`). Vitest only aliases `utils/` and `types/` — any unit-tested module MUST live in `utils/`. Run tests with `npm test`, lint with `npm run lint`.

**Note on spec deviation:** The OG image is a CSS-drawn stylized tier board rather than a live app screenshot (deterministic to generate, no dev-server orchestration needed). Everything else follows the spec.

---

### Task 1: Site constants (`utils/site.ts`)

**Files:**
- Create: `utils/site.ts`
- Test: `tests/site.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/site.test.ts
import { describe, it, expect } from 'vitest';
import { SITE_URL, canonicalUrl } from 'utils/site';

describe('canonicalUrl', () => {
  it('returns the site root with a trailing slash for the homepage', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
  });

  it('appends the pathname for subpages', () => {
    expect(canonicalUrl('/about')).toBe(`${SITE_URL}/about`);
  });

  it('strips trailing slashes from subpage paths', () => {
    expect(canonicalUrl('/about/')).toBe(`${SITE_URL}/about`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/site.test.ts`
Expected: FAIL — cannot resolve `utils/site`.

- [ ] **Step 3: Write the implementation**

```ts
// utils/site.ts
export const SITE_URL = 'https://draft-driver.vercel.app';
export const SITE_NAME = 'Draft Driver';
export const DEFAULT_TITLE = 'Draft Driver | Fantasy Football Draft Tool';
export const DEFAULT_DESCRIPTION =
  'Free fantasy football draft tool with tier-based rankings from Boris Chen, ' +
  'Sleeper projections and ADP, roster tracking, and scarcity-adjusted ' +
  'rankings. Works for PPR, half-PPR, and standard leagues.';
export const OG_IMAGE_URL = `${SITE_URL}/og.png`;

export const canonicalUrl = (pathname: string): string => {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${path}`;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/site.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/site.ts tests/site.test.ts
git commit -m "feat(seo): add site URL/metadata constants and canonicalUrl helper"
```

---

### Task 2: JSON-LD schema builders (`utils/structuredData.ts`)

**Files:**
- Create: `utils/structuredData.ts`
- Test: `tests/structuredData.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/structuredData.test.ts
import { describe, it, expect } from 'vitest';
import { webApplicationSchema, faqPageSchema } from 'utils/structuredData';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from 'utils/site';

describe('webApplicationSchema', () => {
  it('describes Draft Driver as a free web application', () => {
    const schema = webApplicationSchema();
    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(webApplicationSchema()))).not.toThrow();
  });
});

describe('faqPageSchema', () => {
  it('maps each FAQ to a schema.org Question', () => {
    const faqs = [
      { question: 'Is it free?', answer: 'Yes.' },
      { question: 'Formats?', answer: 'PPR, half-PPR, standard.' },
    ];
    const schema = faqPageSchema(faqs);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Is it free?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes.' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/structuredData.test.ts`
Expected: FAIL — cannot resolve `utils/structuredData`.

- [ ] **Step 3: Write the implementation**

```ts
// utils/structuredData.ts
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  OG_IMAGE_URL,
} from 'utils/site';

export type Faq = {
  question: string;
  answer: string;
};

export const webApplicationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: DEFAULT_DESCRIPTION,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  screenshot: OG_IMAGE_URL,
});

export const faqPageSchema = (faqs: Faq[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage' as const,
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/structuredData.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/structuredData.ts tests/structuredData.test.ts
git commit -m "feat(seo): add WebApplication and FAQPage JSON-LD builders"
```

---

### Task 3: `JsonLd` component and full head metadata in `Page`

**Files:**
- Create: `components/JsonLd.tsx`
- Modify: `components/Page.tsx`
- Modify: `pages/_document.tsx`

No unit test (JSX + next/head — covered by the build-output verification in Task 8).

- [ ] **Step 1: Create the JsonLd component**

```tsx
// components/JsonLd.tsx
import Head from 'next/head';

type JsonLdProps = {
  schema: Record<string, unknown>;
};

const JsonLd = ({ schema }: JsonLdProps) => (
  <Head>
    <script
      type="application/ld+json"
      // JSON.stringify of a plain object built in our own code — safe to inline
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  </Head>
);

export default JsonLd;
```

- [ ] **Step 2: Extend Page.tsx head metadata**

Replace the `Meta` type, the meta defaulting, and the `<Head>` block in `components/Page.tsx`. The meta default must merge (current code loses defaults when a partial `meta` is passed):

```tsx
// components/Page.tsx — imports to add:
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  OG_IMAGE_URL,
  canonicalUrl,
} from 'utils/site';
```

```tsx
// Meta stays { title: string; description: string } — remove the inline
// default object from destructuring and merge instead:
const { boxProps = {}, meta: metaProp = {}, children } = props;

const meta: Meta = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  ...metaProp,
};

const canonical = canonicalUrl(router.pathname);
```

```tsx
<Head>
  <title>{meta.title}</title>
  <meta content={meta.description} name="description" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={meta.title} />
  <meta property="og:description" content={meta.description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={OG_IMAGE_URL} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={meta.title} />
  <meta name="twitter:description" content={meta.description} />
  <meta name="twitter:image" content={OG_IMAGE_URL} />
</Head>
```

Note the viewport tag no longer has `maximum-scale=1` (accessibility fix from the spec).

- [ ] **Step 3: Update _document.tsx**

```tsx
// pages/_document.tsx
import { ColorModeScript } from '@chakra-ui/react';
import { Html, Head, Main, NextScript } from 'next/document';

const Document = () => (
  <Html lang="en">
    <Head>
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <meta name="theme-color" content="#1a1a1a" />
    </Head>
    <body>
      <ColorModeScript initialColorMode="dark" />
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
```

(`#1a1a1a` is the theme's `gray.900`, the dark-mode background family.)

- [ ] **Step 4: Verify build and tests**

Run: `npm test && npm run lint && npm run build`
Expected: tests pass, no lint errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/JsonLd.tsx components/Page.tsx pages/_document.tsx
git commit -m "feat(seo): canonical/OG/Twitter tags, lang attr, JsonLd component"
```

---

### Task 4: Homepage JSON-LD + depth-charts page meta

**Files:**
- Modify: `pages/index.tsx`
- Modify: `pages/depth-charts/index.tsx`

- [ ] **Step 1: Add WebApplication JSON-LD to the homepage**

In `pages/index.tsx`, add imports and render `<JsonLd>` inside `<Page>`:

```tsx
import JsonLd from 'components/JsonLd';
import { webApplicationSchema } from 'utils/structuredData';
```

```tsx
const Index: NextPage = () => {
  return (
    <Page>
      <JsonLd schema={webApplicationSchema()} />
      <AppBar />
      {/* ...rest unchanged... */}
```

- [ ] **Step 2: Add unique meta to depth-charts**

In `pages/depth-charts/index.tsx`, pass meta to `Page`:

```tsx
<Page
  meta={{
    title: 'NFL Depth Charts | Draft Driver',
    description:
      'Browse NFL team depth charts by position to spot sleepers and ' +
      'value picks for your fantasy football draft.',
  }}
>
```

(`Page` accepts `meta?: Partial<Meta>` and merges over defaults after Task 3.)

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add pages/index.tsx pages/depth-charts/index.tsx
git commit -m "feat(seo): homepage WebApplication JSON-LD and depth-charts meta"
```

---

### Task 5: FAQ data + `/about` page + About-modal link

**Files:**
- Create: `data/faq.ts`
- Create: `pages/about.tsx`
- Modify: `components/About/AboutModal.tsx`

- [ ] **Step 1: Create the FAQ data module**

```ts
// data/faq.ts
import type { Faq } from 'utils/structuredData';

// Single source of truth: renders as visible FAQ HTML on /about AND as
// FAQPage JSON-LD. Keeping them identical matters — Google penalizes FAQ
// markup that doesn't match visible content.
export const faqs: Faq[] = [
  {
    question: 'Is Draft Driver free?',
    answer:
      'Yes. Draft Driver is completely free — no account, sign-up, or payment required.',
  },
  {
    question: 'Which scoring formats are supported?',
    answer:
      'Standard, PPR (point per reception), and half-PPR. Rankings, tiers, and ADP all adjust to the format you pick in settings.',
  },
  {
    question: 'Where do the rankings come from?',
    answer:
      'Tiers and rankings come from Boris Chen, whose tiers are built from FantasyPros expert consensus rankings. Season projections, average draft position (ADP), team info, and rookie and injury status come from the Sleeper API.',
  },
  {
    question: 'How up to date is the data?',
    answer:
      'Rankings are synced regularly throughout draft season, and Sleeper projections refresh daily. The About dialog in the app shows when rankings were last updated.',
  },
  {
    question: 'Does it work on mobile?',
    answer:
      'Yes. The draft board, roster panel, and settings are all designed to work well on phones and tablets.',
  },
  {
    question: 'Where is my draft data stored?',
    answer:
      'Everything — drafted players, your roster, favorites, notes, keepers, and settings — is saved in your browser via localStorage. Nothing is sent to a server, and refreshing the page keeps your progress.',
  },
  {
    question: 'What are scarcity-adjusted rankings?',
    answer:
      'An optional setting that re-orders players by value over replacement (VORP), computed from your league size and roster configuration, then rebuilds tiers from the value gaps. It highlights positional scarcity instead of raw rank.',
  },
];
```

- [ ] **Step 2: Create the /about page**

```tsx
// pages/about.tsx
import type { NextPage } from 'next';
import NextLink from 'next/link';
import {
  Box,
  Container,
  Heading,
  Link,
  ListItem,
  Text,
  UnorderedList,
} from '@chakra-ui/react';
import Page from 'components/Page';
import AppBar from 'components/AppBar';
import JsonLd from 'components/JsonLd';
import { faqPageSchema } from 'utils/structuredData';
import { faqs } from 'data/faq';

const AboutPage: NextPage = () => {
  return (
    <Page
      meta={{
        title: 'About Draft Driver | Free Fantasy Football Draft Tool',
        description:
          'What Draft Driver is, how its tier-based rankings work, and ' +
          'answers to common questions about the free fantasy football ' +
          'draft tool.',
      }}
    >
      <JsonLd schema={faqPageSchema(faqs)} />
      <AppBar />
      <Box overflowY="auto" paddingY={8} paddingX={6}>
        <Container maxW="container.md">
          <Heading as="h1" size="xl" marginBottom={4}>
            About Draft Driver
          </Heading>
          <Text marginBottom={4}>
            Draft Driver is a free fantasy football draft tool built around a
            tier-based draft board. During your draft, mark players as they
            come off the board, favorite the ones you&apos;re targeting, avoid
            the ones you aren&apos;t, and jot per-player notes — while the
            roster panel tracks your team by position in real time.
          </Text>
          <Text marginBottom={4}>
            Rankings and tiers come from{' '}
            <Link
              href="https://www.borischen.co"
              isExternal
              textDecoration="underline"
            >
              Boris Chen
            </Link>
            , whose tiers are generated from FantasyPros expert consensus
            rankings. Draft Driver enriches them with season projections,
            average draft position (ADP), team info, and rookie and injury
            status from the Sleeper API — so you can see at a glance when a
            player is falling past their ADP or sitting alone at the top of a
            tier.
          </Text>
          <Text marginBottom={6}>
            There&apos;s nothing to install and no account to create.{' '}
            <Link
              as={NextLink}
              href="/"
              textDecoration="underline"
              fontWeight="semibold"
            >
              Open the draft board
            </Link>{' '}
            and start drafting.
          </Text>

          <Heading as="h2" size="lg" marginBottom={3}>
            Features
          </Heading>
          <UnorderedList spacing={1} marginBottom={6}>
            <ListItem>
              Tier-based draft board for standard, PPR, and half-PPR scoring
            </ListItem>
            <ListItem>Player search and position filtering</ListItem>
            <ListItem>
              Favorites, avoid list, per-player notes, and keeper support
            </ListItem>
            <ListItem>
              Roster tracking by position with automatic flex and bench
              handling
            </ListItem>
            <ListItem>
              Scarcity-adjusted rankings: re-order the board by value over
              replacement based on your league and roster settings
            </ListItem>
            <ListItem>Injury status indicators and player news</ListItem>
            <ListItem>NFL team depth charts</ListItem>
            <ListItem>Light and dark mode; works great on mobile</ListItem>
            <ListItem>
              Progress saved automatically in your browser — refresh without
              fear
            </ListItem>
          </UnorderedList>

          <Heading as="h2" size="lg" marginBottom={3}>
            Frequently asked questions
          </Heading>
          {faqs.map((faq) => (
            <Box key={faq.question} marginBottom={4}>
              <Heading as="h3" size="sm" marginBottom={1}>
                {faq.question}
              </Heading>
              <Text fontSize="sm">{faq.answer}</Text>
            </Box>
          ))}
        </Container>
      </Box>
    </Page>
  );
};

export default AboutPage;
```

- [ ] **Step 3: Link to /about from the About modal**

In `components/About/AboutModal.tsx`, add `import NextLink from 'next/link';`
and change the `ModalFooter` to:

```tsx
<ModalFooter gap={3}>
  <Link
    as={NextLink}
    href="/about"
    fontSize="sm"
    textDecoration="underline"
    onClick={props.onClose}
  >
    Learn more
  </Link>
  <Button onClick={props.onClose}>Close</Button>
</ModalFooter>
```

(`Link` is already imported from Chakra in this file.)

- [ ] **Step 4: Verify the page statically renders its prose**

Run: `npm run build`
Expected: build succeeds and the output lists `/about` as a static route (`○`).

Run: `grep -o "tier-based draft board" .next/server/pages/about.html | head -1`
Expected: `tier-based draft board` — proves the prose is in the pre-rendered HTML, not client-only.

- [ ] **Step 5: Commit**

```bash
git add data/faq.ts pages/about.tsx components/About/AboutModal.tsx
git commit -m "feat(seo): add statically rendered /about page with FAQ + FAQPage JSON-LD"
```

---

### Task 6: Crawl files — robots.txt, sitemap.xml, llms.txt

**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Create: `public/llms.txt`

- [ ] **Step 1: Create robots.txt**

```text
# Draft Driver — https://draft-driver.vercel.app
# All crawlers welcome, including AI/LLM crawlers.

User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://draft-driver.vercel.app/sitemap.xml
```

- [ ] **Step 2: Create sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://draft-driver.vercel.app/</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://draft-driver.vercel.app/about</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://draft-driver.vercel.app/depth-charts</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
</urlset>
```

- [ ] **Step 3: Create llms.txt**

```markdown
# Draft Driver

> Draft Driver is a free web-based fantasy football draft tool built around a
> tier-based draft board. It combines Boris Chen's tier rankings (derived from
> FantasyPros expert consensus) with Sleeper API season projections, ADP, and
> injury status. No account or payment required; all draft state is stored
> locally in the user's browser.

Key facts:

- Live app: https://draft-driver.vercel.app
- Supports standard, PPR, and half-PPR scoring formats
- Features: tier-based rankings, player search/filtering, favorites and avoid
  lists, per-player notes, keeper support, roster tracking with flex/bench
  handling, scarcity-adjusted (VORP) rankings, injury indicators, NFL depth
  charts, light/dark mode, mobile support
- Data sources: Boris Chen tiers (https://www.borischen.co) and the Sleeper API
- Free, no account needed, no server-side storage of user data
- Open source: https://github.com/stolte21/draft-driver

## Pages

- [About & FAQ](https://draft-driver.vercel.app/about): what the tool is, how
  the data works, frequently asked questions
- [Draft board](https://draft-driver.vercel.app/): the main draft tool
- [Depth charts](https://draft-driver.vercel.app/depth-charts): NFL team depth
  charts by position
```

- [ ] **Step 4: Verify files serve locally**

```bash
npm run build
npm run start & SERVER_PID=$!
sleep 3
curl -s -o /dev/null -w "%{http_code} " http://localhost:3000/robots.txt http://localhost:3000/sitemap.xml http://localhost:3000/llms.txt; echo
kill $SERVER_PID
```

Expected: `200 200 200`

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt public/sitemap.xml public/llms.txt
git commit -m "feat(seo): add robots.txt, sitemap.xml, and llms.txt"
```

---

### Task 7: OG image + apple-touch-icon

**Files:**
- Create: `public/og.png` (1200×630)
- Create: `public/apple-touch-icon.png` (180×180)
- Scratch: `<scratchpad>/og-template.html`, `<scratchpad>/icon-template.html`

- [ ] **Step 1: Write the OG image HTML template** (in the session scratchpad, not the repo)

```html
<!-- og-template.html — render at exactly 1200x630 -->
<!doctype html>
<html>
<head>
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: linear-gradient(135deg, #1a1a1a 0%, #212121 60%, #1A365D 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #fff; display: flex; align-items: center; padding: 0 72px; gap: 56px;
  }
  .text { flex: 1; }
  h1 { font-size: 84px; font-weight: 800; letter-spacing: -2px; }
  h1 .accent { color: #63b3ed; }
  p { font-size: 30px; margin-top: 18px; color: rgba(255,255,255,0.80); line-height: 1.35; }
  .url { margin-top: 28px; font-size: 24px; color: #63b3ed; font-weight: 600; }
  .board { width: 420px; display: flex; flex-direction: column; gap: 10px; }
  .tier { border-radius: 10px; padding: 10px 16px; background: rgba(255,255,255,0.06);
          border-left: 6px solid; }
  .tier h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px;
             color: rgba(255,255,255,0.55); margin-bottom: 6px; }
  .row { display: flex; justify-content: space-between; font-size: 19px; padding: 5px 0; }
  .row .pos { color: rgba(255,255,255,0.55); font-size: 16px; }
  .t1 { border-color: #4299e1; } .t2 { border-color: #48BB78; } .t3 { border-color: #ECC94B; }
</style>
</head>
<body>
  <div class="text">
    <h1>Draft <span class="accent">Driver</span></h1>
    <p>Free fantasy football draft tool with tier-based rankings, projections &amp; ADP, and live roster tracking.</p>
    <div class="url">draft-driver.vercel.app</div>
  </div>
  <div class="board">
    <div class="tier t1"><h2>Tier 1</h2>
      <div class="row"><span>1. J. Chase</span><span class="pos">WR · CIN</span></div>
      <div class="row"><span>2. B. Robinson</span><span class="pos">RB · ATL</span></div>
    </div>
    <div class="tier t2"><h2>Tier 2</h2>
      <div class="row"><span>3. J. Jefferson</span><span class="pos">WR · MIN</span></div>
      <div class="row"><span>4. S. Barkley</span><span class="pos">RB · PHI</span></div>
    </div>
    <div class="tier t3"><h2>Tier 3</h2>
      <div class="row"><span>5. C. Lamb</span><span class="pos">WR · DAL</span></div>
      <div class="row"><span>6. J. Gibbs</span><span class="pos">RB · DET</span></div>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Write the apple-touch-icon template** (scratchpad)

```html
<!-- icon-template.html — render at exactly 180x180 -->
<!doctype html>
<html>
<head>
<style>
  * { margin: 0; }
  body {
    width: 180px; height: 180px; overflow: hidden;
    background: linear-gradient(135deg, #212121, #1A365D);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .mark { font-size: 84px; font-weight: 800; color: #fff; letter-spacing: -4px; }
  .mark span { color: #63b3ed; }
</style>
</head>
<body><div class="mark">D<span>D</span></div></body>
</html>
```

- [ ] **Step 3: Screenshot both templates to PNG**

Use the Playwright browser (MCP tools or `npx playwright screenshot`):

```bash
npx playwright screenshot --viewport-size=1200,630 "file://<scratchpad>/og-template.html" public/og.png
npx playwright screenshot --viewport-size=180,180 "file://<scratchpad>/icon-template.html" public/apple-touch-icon.png
```

If `npx playwright` lacks browsers, use the running Playwright MCP server instead: navigate to the `file://` URL, resize viewport to the exact dimensions, take a screenshot, and save it to the target path.

- [ ] **Step 4: Verify dimensions**

Run: `sips -g pixelWidth -g pixelHeight public/og.png public/apple-touch-icon.png`
Expected: 1200×630 and 180×180.

Then visually inspect both PNGs (Read tool) — text legible, nothing clipped.

- [ ] **Step 5: Commit**

```bash
git add public/og.png public/apple-touch-icon.png
git commit -m "feat(seo): add OG share image and apple-touch-icon"
```

---

### Task 8: Full local verification of rendered HTML

**Files:** none (verification only)

- [ ] **Step 1: Build and start the production server**

```bash
npm test && npm run lint && npm run build
npm run start & SERVER_PID=$!
sleep 3
```

Expected: all tests pass, lint clean, build succeeds. (`$SERVER_PID` is used to stop the server in Step 4.)

- [ ] **Step 2: Verify homepage head tags in raw HTML**

```bash
curl -s http://localhost:3000/ | grep -c 'rel="canonical"'
curl -s http://localhost:3000/ | grep -o 'application/ld+json'
curl -s http://localhost:3000/ | grep -o 'og:image'
curl -s http://localhost:3000/ | grep -o 'maximum-scale' || echo "viewport OK"
```

Expected: canonical count ≥ 1; `application/ld+json` present; `og:image` present; `viewport OK` (no maximum-scale).

- [ ] **Step 3: Verify /about prose and FAQ JSON-LD without JS**

```bash
curl -s http://localhost:3000/about | grep -o 'tier-based draft board' | head -1
curl -s http://localhost:3000/about | python3 -c "
import sys, re, json
html = sys.stdin.read()
m = re.search(r'<script type=\"application/ld\+json\"[^>]*>(.*?)</script>', html, re.S)
data = json.loads(m.group(1))
assert data['@type'] == 'FAQPage' and len(data['mainEntity']) == 7, data
print('FAQPage JSON-LD valid, 7 questions')
"
```

Expected: prose found; `FAQPage JSON-LD valid, 7 questions`.

- [ ] **Step 4: Verify unique depth-charts meta and crawl files**

```bash
curl -s http://localhost:3000/depth-charts | grep -o '<title>NFL Depth Charts | Draft Driver</title>'
curl -s -o /dev/null -w "%{http_code} " http://localhost:3000/robots.txt http://localhost:3000/sitemap.xml http://localhost:3000/llms.txt http://localhost:3000/og.png http://localhost:3000/apple-touch-icon.png; echo
kill $SERVER_PID
```

Expected: depth-charts title found; `200 200 200 200 200`.

- [ ] **Step 5: Commit any fixes found**

If any check failed, fix, re-run the failed check, and commit with a descriptive message. If all passed with no changes, nothing to commit.

---

### Task 9: Off-site — README rewrite and GitHub repo metadata

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite README.md**

```markdown
# Draft Driver

**Live app: [draft-driver.vercel.app](https://draft-driver.vercel.app)**

A free fantasy football draft tool built around a tier-based draft board.
Track your draft in real time: mark players as drafted, favorite or avoid
them, keep per-player notes, and watch your roster fill up by position.

![draft-driver](https://user-images.githubusercontent.com/3914543/185001004-0ec2dee4-6482-425b-adf9-a8bdcbca0ac8.png)

## Data sources

- **Rankings & tiers** — [Boris Chen](https://www.borischen.co)'s tiers,
  generated from FantasyPros expert consensus rankings
- **Projections, ADP, teams, rookie & injury status** — the
  [Sleeper](https://sleeper.com) API, cached in-memory for 24 hours

## Features

- Tier-based draft board for **standard, PPR, and half-PPR** scoring
- Player search and position filtering
- Favorites, avoid list, per-player notes, and keeper support
- Roster tracking by position with automatic flex/bench handling
- **Scarcity-adjusted rankings** — optionally re-order the board by value
  over replacement (VORP) computed from your league and roster settings
- Injury status indicators and player news
- NFL team depth charts
- Light and dark modes; works great on mobile
- Progress saved automatically to your browser — no account needed

## Development

```bash
npm install
npm run dev    # start the dev server
npm test       # run unit tests (vitest)
npm run lint   # eslint
npm run build  # production build
```
```

- [ ] **Step 2: Update GitHub repo metadata**

```bash
gh repo edit stolte21/draft-driver \
  --description "Free fantasy football draft tool — tier-based rankings, projections & ADP, roster tracking. PPR / half-PPR / standard." \
  --homepage "https://draft-driver.vercel.app"
```

Expected: command exits 0; `gh repo view stolte21/draft-driver --json description,homepageUrl` shows the new values.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with current data sources, features, and live URL"
```

---

### Task 10: Ship

- [ ] **Step 1:** Use superpowers:verification-before-completion — re-run `npm test && npm run lint && npm run build` and confirm output before claiming done.
- [ ] **Step 2:** Use superpowers:finishing-a-development-branch — push `seo-discoverability` and open a PR to `main`. PR description must include the post-merge checklist for the user:
  1. Verify on production: `https://draft-driver.vercel.app/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/about` all return 200 and the homepage HTML contains the OG/JSON-LD tags.
  2. **Google Search Console** (needs your Google account): add `draft-driver.vercel.app` as a URL-prefix property → verify via HTML tag or file → Sitemaps → submit `https://draft-driver.vercel.app/sitemap.xml` → use URL Inspection to request indexing for `/` and `/about`.
  3. Optional spot-checks: share the URL in a Slack/Discord to confirm the OG card renders; paste the homepage URL into https://search.google.com/test/rich-results to validate the `WebApplication` and `FAQPage` schemas.
