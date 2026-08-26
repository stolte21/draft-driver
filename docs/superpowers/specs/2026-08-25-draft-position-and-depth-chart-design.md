# Draft Position & Player Depth Chart — Design

Date: 2026-08-25
Status: Approved

## Overview

Two features to help during a live draft:

1. **Draft position awareness** — a setting for the user's draft slot. When
   set, the app (a) shows a visual "you're on the clock" indicator around the
   viewport when the next pick is theirs, and (b) automatically adds the
   player they draft on their pick to their roster.
2. **Depth chart in player details** — the player details modal shows the
   player's team depth chart for their position, with the player highlighted,
   so the user no longer has to visit the depth charts page mid-draft.

## Decisions made during brainstorming

- Draft order is assumed to be **snake** (no linear option, no toggle).
- Auto-roster happens **without a prompt**; the existing manual toggle on the
  picks list remains the escape hatch.
- The modal depth chart shows the **position group only** (not full team
  offense), matching what the depth charts page displays.
- Both features are client-side; **no API changes**.

## Feature 1: Draft position

### Settings state (`providers/settingsReducer.ts`)

- New field: `draftPosition: number | null`, default `null` (feature off).
- New action: `{ type: 'set-draft-position'; payload: number | null }`.
- Hydration: any value that is not a positive integer becomes `null`.
- If `draftPosition > numTeams` (league shrunk after setting it), consumers
  treat it as unset. The stored value is **not** mutated, so growing the
  league back restores the feature. The reducer never clamps.

### Settings UI (`components/Settings/SettingsModal.tsx`)

- "Your Draft Position" control alongside the existing number-of-teams
  control: a stepper bounded 1..`numTeams`, where 0/empty renders as "Off"
  and maps to `null`.

### Pick math (new `utils/draftPosition.ts`)

Pure, unit-tested helpers:

- `getPickInfo(overall, numTeams)` → `{ round, pickInRound }` where
  `round = floor((overall - 1) / numTeams) + 1` and
  `pickInRound = ((overall - 1) % numTeams) + 1`.
- `isUsersPick(overall, numTeams, draftPosition)` → boolean. Snake order:
  the user's slot is `draftPosition` in odd rounds and
  `numTeams - draftPosition + 1` in even rounds. Returns `false` when
  `draftPosition` is `null` or outside 1..`numTeams`.

The next overall pick is `draftedPlayers.length + 1` — the same derivation
`DraftBoardPickRow` already uses for round/pick labels, so all displays
agree. Keepers are not part of `draftedPlayers` and do not affect the count
(existing behavior, unchanged).

### DraftProvider getters (`providers/DraftProvider.tsx`)

- `isMyPick: boolean` — true when `draftPosition` is set/valid and the next
  overall pick lands on the user's slot.
- `nextPick: { round: number; pick: number }` — for the auto-roster payload.

### Auto-roster (`providers/draftReducer.ts`)

- The `draft` action payload changes from `Player` to
  `{ player: Player; addToRoster?: { round: number; pick: number } }`.
- When `addToRoster` is present, the reducer appends the player to both
  `draftedPlayers` and `roster` in a single state update (one localStorage
  write).
- `DraftBoardRankingRow` includes `addToRoster: nextPick` when `isMyPick`.
- `undo` already removes the top drafted player from the roster; it works
  unchanged. The manual roster toggle on pick rows works unchanged.

### Glow indicator (new `components/MyPickIndicator`)

- Mounted on the main page (`pages/index.tsx`).
- When `isMyPick`: a `position: fixed`, full-viewport, `pointer-events: none`
  overlay with a pulsing inset box-shadow in the theme accent color.
- Appears as soon as the pick before the user's is made; disappears the
  moment they draft (both fall out of the `isMyPick` derivation — no extra
  state).

## Feature 2: Depth chart in player details

### Modal section (`components/DraftBoard/PlayerDetailsModal.tsx`)

- New "Depth Chart" section below the stats grid, rendered only for
  QB/RB/WR/TE players.
- Data comes from the existing `useDepthCharts()` hook (client-cached with
  `staleTime: Infinity`, shared with the depth charts page — no new API).
- Content: the player's team's chart filtered to the player's position, in
  depth order, with the viewed player's row highlighted.
- Player matching: by id — both ranking players and depth chart entries
  derive ids via `parseId`. Fallback to normalized-name comparison if the id
  forms turn out to differ for some players.
- The existing "Depth Chart: RB 2" stat item **stays** — it carries Sleeper's
  more specific slot (e.g. `LWR 1`) which the position-group list does not.
- Failure handling: the section hides itself while depth charts are loading,
  on fetch error, or when there is no chart for the team/position. It never
  blocks or degrades the rest of the modal.
- If the viewed player is not present in the list (no `depth_chart_order` in
  Sleeper data), the list still renders without a highlight.

### Known caveat

Sleeper tracks WR slots separately (LWR/RWR/SWR), so a team's WR list can
contain several order-1 players. This matches the depth charts page today;
the slot detail remains visible via the stat item.

## Testing

- `tests/draftPosition.test.ts` (new): `getPickInfo` and `isUsersPick`
  across rounds, snake reversal, boundary slots (1 and `numTeams`), and
  invalid positions (null, 0, > numTeams).
- `tests/settingsReducer.test.ts`: `set-draft-position`, hydration coercion
  of invalid values.
- `tests/draftReducer.test.ts`: `draft` with and without `addToRoster`;
  undo after an auto-rostered draft.
- Manual browser pass on the dev server: glow appears/disappears at the
  right picks, auto-roster lands with correct round.pick, modal depth chart
  renders and highlights correctly, K/DST show no section.

## Out of scope

- Linear draft order, per-league order toggles.
- Keeper-aware pick skipping (keepers already sit outside the pick count).
- Any server/API changes.
