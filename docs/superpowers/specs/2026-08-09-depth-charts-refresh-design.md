# Depth Charts Refresh — Design

**Date:** 2026-08-09
**Route:** `/depth-charts`

## Problem

The depth charts page renders 2025 rosters because its data source is a
manually saved FantasyPros HTML snapshot (`public/depth-chart.html`,
committed 2025-08-23) parsed at request time by `parseDepthCharts` in
`utils/scrape.ts`. The page is also hard to navigate: no way to tell which
team you're looking at mid-scroll, no player search, and no way to jump to
a team without scrolling. Washington is labeled `WSH` while the common
convention is `WAS`.

## Goals

1. Live, self-refreshing depth chart data (no manual snapshots).
2. Sticky team headers while scrolling.
3. Sticky search bar that filters players by name.
4. Side index rail to jump to any team.
5. Rename Washington's abbreviation `WSH` → `WAS`.

## 1. Data source — Sleeper players endpoint

New `utils/depthCharts.ts` exposing `getDepthCharts(): Promise<DepthChart[]>`:

- Fetches `https://api.sleeper.app/v1/players/nfl` (~14MB JSON map of
  `player_id → player`) with the same 10s abort-timeout pattern as
  `utils/projections.ts`, wrapped in `cached()` with a 24h TTL. Sleeper asks
  that this endpoint be called at most ~once per day.
- Filters records to: `active === true`, `team` is one of the 32 known
  abbreviations (the feed contains legacy records, e.g. `OAK`), `position`
  in QB/RB/WR/TE, and `depth_chart_order != null`.
- Groups by team; positions ordered QB → RB → WR → TE; players within a
  position sorted by `depth_chart_order`. Teams sorted alphabetically by
  abbreviation.
- Player shape stays `{ id: parseId({ name, pos }), name, pos }` so the
  existing client-side rank/ADP merge in `DepthCharts.tsx` keeps working.
  The dead `ecr` field is removed from `DepthChartPlayer`.

`/api/depth-charts.ts` calls `getDepthCharts()` and returns a 502 with an
error body on failure instead of the current bare re-throw.

**Deleted:** `parseDepthCharts`, the `node-html-parser` dependency usage,
and `public/depth-chart.html`. `TEAM_TO_ABRV_MAP` moves to `utils/teams.ts`
because `pages/api/rankings.ts` still uses it to map Boris Chen DST team
names to abbreviations; `utils/scrape.ts` is deleted.

## 1b. Development disk cache

`cached()` is an in-memory `Map` scoped to the server process, so in dev
every restart — and every recompile triggered by editing server-side code —
resets it, which would re-fetch the 14MB endpoint far more than once a day.

In development only (`NODE_ENV !== 'production'`), the depth-charts fetcher
reads/writes a gitignored disk cache file (`.cache/sleeper-players.json`):

- If the file exists and its mtime is within 24h, use it (no network).
- Otherwise fetch from Sleeper and write the result back.

Production keeps the in-memory-only behavior (Vercel's filesystem is not
reliably writable/persistent). `.cache/` is added to `.gitignore`.

## 2. WSH → WAS

- `TEAM_TO_ABRV_MAP`: `'Washington Commanders': 'WAS'`.
- Remove the `WAS → 'WSH'` entry in `SLEEPER_TEAM_ALIASES`
  (`utils/projections.ts`); delete the alias map entirely if it becomes
  empty.
- Player ids are name+position based, so persisted localStorage draft state
  is unaffected; only the displayed team label changes.

## 3. Sticky toolbar with search

The page scrolls inside an inner `Box` (`pages/depth-charts/index.tsx`), so
`position: sticky` works against that container.

- A sticky toolbar (top: 0, above team headers in z-order) holds a search
  `Input` and the existing "Value Pick" legend.
- Search filters player rows by normalized substring match using
  `normalizePlayerName` (so "amonra" matches Amon-Ra St. Brown). Position
  tables with zero matches are hidden; teams with zero matches across all
  positions are hidden entirely. Empty query shows everything.
- Hardcoded dark-only colors (`gray.700`/`gray.600` on the heading, legend,
  toolbar) become light/dark-aware via semantic tokens or
  `useColorModeValue`.

## 4. Sticky team headers

Each team `Heading` gets `position: sticky` with `top` set just below the
toolbar height, so the current team label stays pinned while its position
tables scroll by. Lower z-index than the toolbar.

## 5. Side index rail

- A slim fixed rail on the right edge listing all 32 team abbreviations
  vertically in compact type.
- Clicking an abbreviation smooth-scrolls to that team's section (each team
  `Box` gets `id={team}`; scroll via `scrollIntoView`).
- An `IntersectionObserver` scroll-spy highlights the abbreviation of the
  team currently in view, so the rail doubles as a position indicator.
- 32 rows need roughly 580px of height, so the rail renders at the `md`
  breakpoint and up; on mobile it is hidden and search covers the
  find-a-team case.

## Error handling

- Sleeper fetch failure → `/api/depth-charts` responds 502; the client
  provider already handles a failed load by rendering no teams (unchanged).
- Malformed/partial Sleeper records (missing name or position) are skipped
  during transform.

## Testing

- Unit tests for the Sleeper → `DepthChart[]` transform: a small mock of
  the Sleeper JSON exercises filtering (inactive players, legacy teams,
  null `depth_chart_order`), ordering, and id generation. Lives alongside
  `tests/draftReducer.test.ts`.
- UI (sticky behavior, search filtering, rail navigation) verified manually
  in the browser preview against the live endpoint.
