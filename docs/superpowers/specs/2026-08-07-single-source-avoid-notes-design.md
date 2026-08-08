# Design: Single Data Source, Avoid Players, Player Notes

**Date:** 2026-08-07
**Status:** Approved

Three related improvements to the draft tool:

1. Remove the "data source" concept — Boris Chen becomes the only rankings source.
2. Add an "avoided" player state as the counterpart to favorites (mutually exclusive).
3. Add per-player notes, editable from the row menu.

## Background

State lives in two React contexts (`SettingsProvider`, `DraftProvider`), each a
`useReducer` whose reducer persists every new state to localStorage via
`setStorageItem` and hydrates on mount via a `hydrate` action that defensively
validates each field. New state follows this exact pattern.

The row action menu lives in `components/DraftBoard/DraftBoardRankingRow.tsx`
(currently "Toggle Favorite" / "Add Keeper"). Rows render inside a virtualized
`react-window` list (`DraftBoardList`), so rows unmount when scrolled offscreen.

## 1. Remove data source selection

The `fp` ("ADP") source is vestigial: Sleeper ADP data is still needed as an
*enhancement* to Boris rankings (team, rookie flag, ADP, vsAdp merge) but no
longer makes sense as a standalone rankings source.

Changes:

- Delete `components/Settings/SettingsDataSource.tsx` (already rendered
  `isDisabled`) and remove its usage from `components/Settings/Settings.tsx`.
- `SettingsProvider`: remove `dataSource` from `State`, the
  `change-data-source` action, and its hydrate validation. During hydrate,
  strip a stray `dataSource` key from old localStorage blobs so storage stays
  clean.
- `hooks/useRankings.ts`: remove the `dataSource` option. Query key becomes
  `['rankings', format]`; request URL drops `src=`.
- `providers/DraftProvider.tsx`: stop passing `dataSource` to `useRankings`.
- `pages/api/rankings.ts`: remove `validateDataSource` and the `src` query
  param. All `dataSource === 'boris'` branches become unconditional: always
  fetch Boris data, always backfill missing K/DST from projections, always
  compute `vsAdp`. `buildAdpRankings` remains — it feeds the ADP/team merge.
- `types/index.ts`: remove the `DataSource` type.
- `utils/index.ts`: remove `dataSourcesList` and `getRankingsName`.
- Update any remaining references (`components/StaleRankingsBanner.tsx`,
  `components/AppBar/index.tsx`).

## 2. Favorite / Avoid

### State (`DraftProvider`)

- Add `avoided: Player['id'][]` alongside `favorites`, with hydrate
  validation (`Array.isArray` fallback to `[]`) and an `avoidedPlayerIds`
  Set getter.
- Actions keep the toggle shape, with reducer-enforced mutual exclusion:
  - `toggle-favorite` adds/removes the id in `favorites` **and always removes
    it from `avoided`**.
  - New `toggle-avoid` adds/removes the id in `avoided` **and always removes
    it from `favorites`**.

A player can be favorited, avoided, or neither — never both. The invariant is
enforced in the reducer, so it holds regardless of UI state.

### Menu (in `DraftBoardRankingRow`)

Both actions are always available; the label reflects current state, and
selecting the opposite action switches the player:

| Player state | Menu items shown |
| --- | --- |
| Neither | **Favorite**, **Avoid** |
| Favorited | **Unfavorite**, **Avoid** (avoiding auto-unfavorites) |
| Avoided | **Favorite** (favoriting auto-unavoids), **Unavoid** |

The old "Toggle Favorite" label is replaced by these state-aware labels.

### Row UI

- Avoided rows show Chakra's `NotAllowedIcon` in the slot where the heart
  icon renders for favorites (they're mutually exclusive, so the slot is
  never contested).
- Avoided row content is dimmed (`opacity` ≈ 0.45 on the row's text), visually
  distinct from the drafted-row treatment (dark background + strikethrough).
- No filter chip for avoided players; they stay in the rankings list, dimmed.

## 3. Player notes

### State (`DraftProvider`)

- Add `notes: Record<Player['id'], string>`, hydrate-validated (fallback to
  `{}`), persisted like all other draft state.
- New `set-note` action with payload `{ id, note }`. Setting an empty/
  whitespace-only note deletes the key.
- Notes are independent of favorite/avoid and survive draft `reset` (which
  only clears `draftedPlayers` and `roster`, same as favorites today).

### UI

- Row menu gains **Add Note** (no note) / **Edit Note** (note exists).
- Selecting it opens a modal with a textarea pre-filled with the existing
  note, plus Save/Cancel. Saving dispatches `set-note`; clearing the text and
  saving deletes the note.
- Because rows are virtualized and unmount on scroll, the modal is owned by
  `DraftBoardList` (new `PlayerNoteModal` component), not the row. The row
  receives an `onEditNote(player)` callback threaded through the list's
  `itemData`.
- Rows with a note show a small note icon (new `NoteIcon` component following
  the `HeartIcon` pattern) wrapped in a Chakra `Tooltip` displaying the note
  text on hover.

## Testing

- Export `draftReducer` from `DraftProvider` and add vitest coverage in
  `tests/` for:
  - `toggle-favorite` / `toggle-avoid` mutual exclusion (both directions).
  - `set-note` set, update, and empty-string deletion.
  - `hydrate` validation of `avoided` and `notes` on malformed/legacy blobs.
- Existing test setup (vitest, `tests/*.test.ts`) is reused as-is.

## Implementation order

1. **Data source removal** — pure deletion, shrinks the surface first.
2. **Favorite/Avoid** — state + reducer + menu + row UI.
3. **Notes** — state + reducer + modal + row indicator.

Each step leaves the app fully working and independently verifiable.
