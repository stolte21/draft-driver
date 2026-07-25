# Scarcity-Adjusted Rankings (Roster-Aware VORP)

**Date:** 2026-07-25
**Status:** Approved

## Problem

The roster size/configuration setting (e.g., 2 QBs for a 2QB league) currently only
helps users track which positions they still need to draft. It has no effect on the
rankings themselves. But roster construction changes player value: in a 12-team 2QB
league, ~24 QBs start every week instead of ~12, which makes QBs dramatically more
valuable than consensus 1QB rankings suggest. Neither data source (Boris Chen tiers,
FantasyPros ADP) accounts for this.

## Solution Overview

Add an opt-in **"Scarcity-adjusted rankings"** mode that re-orders the draft board by
**value over replacement (VORP)** computed from projected fantasy points, the user's
roster configuration, and league size. The feature is generalized: any roster config
(2 QB, 3 WR, no TE, 14 teams) influences the ordering — 2QB is just the motivating
case. When enabled, tiers are recomputed from the value distribution so tier display
stays meaningful.

Data flow:

1. Server: scrape FantasyPros draft projections, attach `projectedPoints` to each
   player in the `/api/rankings` response (cached daily).
2. Client: when the settings toggle is on, a pure value engine computes replacement
   levels from `rosterSize` × `numTeams`, derives each player's value, re-sorts the
   board, and recomputes tiers via value-gap clustering.

The API stays roster-config-agnostic; changing roster settings re-ranks instantly on
the client with no refetch.

## 1. Data Layer — Projections Scraper

New `utils/projections.ts`, following the pattern of `utils/scrape.ts`:

- Fetches FantasyPros **draft projections** per position:
  `https://www.fantasypros.com/nfl/projections/{qb,rb,wr,te,k,dst}.php?week=draft`.
- The `scoring` query param is mapped from `Format` (`PPR`, `HALF`, default for
  standard) since receptions affect RB/WR/TE totals. QB/K/DST are unaffected by
  scoring but fetched the same way for uniformity.
- Parses each table row into `{ name, pos, points }` where `points` is the FPTS
  column. Malformed rows are skipped individually.
- All six fetches run in parallel, and in parallel with the existing ADP/rookies/
  Boris fetches, via `Promise.all`.

Name matching is by player name, same as the existing Boris↔FantasyPros merge.
Projections come from the same site as the ADP data, so names agree with the `fp`
source nearly perfectly; Boris names already match FantasyPros names today.

## 2. API Change

`/api/rankings` attaches `projectedPoints?: number` to each `Player` (new optional
field in `types/index.ts`). Players with no projection match simply omit the field.
No new query params; the react-query cache key (`format`, `dataSource`) is unchanged.

## 3. Settings

- `SettingsProvider` state gains `useScarcityAdjustment: boolean`, default `false`,
  with a toggle action and hydration validation, persisted to localStorage like the
  other settings.
- New `SettingsScarcitySwitch` component alongside `SettingsHidePlayersSwitch`.
- Off by default: existing users see no behavior change until they opt in.

## 4. Client Value Engine

New pure functions in `utils/vorp.ts` (no React imports, unit-testable):

### `computeReplacementLevels(players, rosterSize, numTeams)`

- Starters per position = `rosterSize[pos] × numTeams` for QB/RB/WR/TE/K/DST.
- FLX slots are allocated data-driven: for each of the `FLX × numTeams` slots, the
  slot goes to whichever of RB/WR/TE has the highest-projected next-best player.
- Replacement level per position = projected points of the last starter.
- Bench slots are ignored in v1 (documented simplification).

### `computeAdjustedRankings(players, rosterSize, numTeams)`

- `value = projectedPoints − replacementLevel[position]`.
- Sort descending by value; tie-break by original `rank`.
- Players with no `projectedPoints` sink to the bottom in original-rank order.
- Emergent behavior: a position with 0 roster slots gets replacement = its best
  player, so the entire position's value ≤ 0 and it sinks — the board reflects
  "you don't need this position."

### 4b. Value-Based Tiers

When the toggle is on, tiers are recomputed from the value distribution (Boris's
overall tiers are clusters of 1QB consensus value and would interleave into visual
noise under re-ordering — the row banding relies on tier being monotonically
non-decreasing down the list):

- After sorting by value descending, start a new tier wherever the drop between
  consecutive players' values exceeds a threshold.
- Threshold is relative to the distribution — a multiple of the median
  consecutive-gap among the top ~200 players — so it adapts to flat vs. top-heavy
  years, with a minimum-points floor so micro-gaps don't fragment tiers. Tune to
  land around 15–25 tiers over the full board.
- The computed tier overwrites `player.tier` **in the derived list only**; source
  data and the toggle-off view are untouched. Banding UI (`tier % 2`) and the
  "Tier N" label work unchanged since recomputed tiers are contiguous by
  construction.
- Applies to both sources: Boris order gets scarcity-correct tiers, and the
  FantasyPros source gains tiers it never had.

### Integration

The DraftBoard derives the displayed list in a `useMemo` over
`(rankings, rosterSize, numTeams, useScarcityAdjustment)`: sort by value, recompute
tiers, overwrite the displayed rank. The original source rank remains visible as a
secondary dimmed value so users can see the delta. `pRank`, `vsAdp`, and the rest of
the row display are unchanged.

## 5. Server-Side Caching

- New `utils/cache.ts`: generic `cached(key, ttlMs, fetcher)` backed by a
  module-scope `Map` of `{ value, fetchedAt }`, with in-flight promise dedupe so
  concurrent requests trigger a single scrape.
- Projections are wrapped with a **24-hour TTL, keyed by format**
  (`projections:ppr`, etc.). Projections barely move day to day.
- Caveats: in-memory, so it resets on server restart; on a serverless deploy it
  would persist only per warm instance. Acceptable for how this app runs
  (`next dev` / `next start`); no new infra.
- Follow-up (out of scope): the existing ADP/rookies/Boris fetches could be wrapped
  with a shorter TTL (~1 hour) to speed up cold page loads, but that changes current
  freshness behavior so it is deliberately not part of this feature.
- Client-side, react-query already caches with `staleTime: Infinity` per
  format/source combo per session; the server cache protects across page loads,
  sessions, and devices.

## 6. Error Handling

- Projections fetch failure is **non-fatal**: the API logs the error and returns
  players without `projectedPoints`; the client falls back to source order (the
  toggle effectively no-ops rather than erroring).
- Malformed projection rows are skipped individually.
- Hydration validation coerces `useScarcityAdjustment` to a boolean.

## 7. Testing

- Add **vitest** (repo currently has no test runner) for the pure value engine:
  - Replacement-level computation across configs: 1QB vs 2QB, flex allocation,
    zero-slot positions, varying `numTeams`.
  - Value sorting, tie-breaking by original rank, no-projection fallback ordering.
  - Tier clustering: contiguity, threshold behavior on flat vs. cliffed
    distributions, tier-count sanity.
- Scraper verified manually against the live page, consistent with how the existing
  scrapers are treated.

## Decisions Log

| Decision | Choice |
| --- | --- |
| Output UX | Re-ordered rankings (single adjusted list; original rank shown dimmed) |
| Scope | Generalized to any roster config, not 2QB-specific |
| Value model | Projections-based VORP (FantasyPros draft projections) |
| Computation location | Client-side from `projectedPoints`; API stays config-agnostic |
| Activation | Settings toggle, off by default |
| Tiers under adjustment | Recomputed client-side via value-gap clustering |
| Projections caching | Server-side in-memory, 24h TTL per format |
