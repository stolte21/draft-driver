# About Modal & Data Source Label Updates — Design

**Date:** 2026-08-08
**Status:** Approved

## Goal

Correct how the app credits its data sources, refresh stale settings copy,
and add an About modal that explains the tool and credits Boris Chen.

Background: Boris Chen's tiers are built from FantasyPros expert consensus
rankings (ECR). The UI currently labels the rankings "Boris Chen PPR",
which misattributes the underlying rankings. Per user decision, in-app
labels reference FantasyPros; Boris Chen is credited in the About modal.

## Changes

### 1. Data source labels

- `components/AppBar/index.tsx`: subtitle changes from
  `Rankings: Boris Chen {format}` to `Rankings: FantasyPros {format}`.
  Format name remains driven by `getFormatName(state.format)`.
- `components/StaleRankingsBanner.tsx`: "Boris Chen rankings were last
  updated {date}…" becomes source-neutral: "Rankings were last updated
  {date} and may be from a previous season."

### 2. Settings copy

- `components/Settings/SettingsTeams.tsx` helper text:
  "Number of teams in the draft. Used to show pick numbers and to compute
  scarcity-adjusted rankings."
- `components/Settings/SettingsRoster.tsx` helper text:
  "Number of players per position. Used to track your roster composition
  and to compute scarcity-adjusted rankings."
- `SettingsScarcitySwitch` and `SettingsHidePlayersSwitch` copy is
  accurate; no change.

### 3. About modal

New `components/About/` directory following the existing component
pattern (`index.ts` re-export + component files):

- `AboutButton`: Chakra `IconButton` with an info ("i" in circle) icon,
  `variant="ghost"`, matching `ChartsButton`/`Settings` styling. Placed in
  the AppBar button group between `ChartsButton` and `SettingsButton`.
- `AboutModal`: Chakra `Modal` with `size={['xs', 'sm', 'lg']}` (same as
  `SettingsModal`), header "About Draft Driver", close button and footer
  Close button. Opened via `useDisclosure` in `AboutButton`'s parent
  component (mirroring how `Settings` composes button + modal).

Content — two short sections:

1. **How it works**: tier-based draft board; optional scarcity-adjusted
   re-ranking (value over replacement computed from roster sizes and
   league size); favorites, avoided players, and per-player notes; roster
   tracking. All draft state is stored locally in the browser.
2. **Data & credits**: tiers and rankings from
   [Boris Chen](https://www.borischen.co) (external link, opens in new
   tab), whose tiers are built on FantasyPros expert consensus rankings;
   season projections, ADP, teams, and rookie flags from the Sleeper API.
   Shows the rankings-last-updated date from
   `useDraft().getters.rankingsLastModified` (formatted like the stale
   banner; omitted if unavailable).

## Non-goals

- No GitHub repo link (user declined).
- No API, state, or dependency changes.
- No new unit tests — changes are presentational copy; verify visually.

## Alternatives considered

- Reusing `SettingsModal` as a generic modal: rejected, keeps About
  self-contained and avoids widening SettingsModal's contract.
- Separate `/about` page: rejected, heavier than needed and breaks the
  toolbar interaction pattern.
