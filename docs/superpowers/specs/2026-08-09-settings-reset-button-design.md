# Settings Reset Button — Design

**Date:** 2026-08-09
**Status:** Approved

## Goal

Add a button at the bottom of the settings form that resets the site to its
default state — clearing all user data (draft progress, favorites, avoided
players, notes, keepers) and all settings — without reloading the page.

## Decisions

- **Scope:** Full reset — both `draft-driver__settings` and
  `draft-driver__draft` user state (user chose "everything").
- **Mechanism:** Reducer-driven reset, no `window.location.reload()`
  (user preference). Both reducers already persist every new state to
  localStorage in their tail, so dispatching reset actions overwrites
  storage with defaults automatically — no manual key clearing.
- **Safety:** Destructive action, so the button opens a confirmation
  `AlertDialog` before resetting.

## Changes

### 1. `providers/draftReducer.ts`

Add a `reset-all` action (the existing `reset` action only clears
`draftedPlayers` and `roster`). `reset-all` clears:

- `draftedPlayers`, `roster`, `favorites`, `avoided`, `notes`, `keepers`,
  `filter`

and keeps `rankings`, `rankingsLastModified`, and `isHydrated` — rankings
are fetched data, not user state; wiping them would blank the board until a
refetch.

### 2. `providers/SettingsProvider.tsx`

Extract the inline initial state passed to `useReducer` into a
`defaultState` constant. Add a `reset` action that returns
`{ ...defaultState, isHydrated: true }`. If the format changes as a result
(e.g. ppr → standard), `useRankings` refetches for the new format — correct
behavior.

### 3. `components/Settings/SettingsReset.tsx` (new)

- Full-width `colorScheme="red"` `variant="outline"` button labeled
  "Reset all data", rendered last in `Settings.tsx` after a `Divider`.
- Clicking opens a Chakra `AlertDialog`: "This will clear your drafted
  players, roster, favorites, notes, keepers, and settings. This can't be
  undone."
- Confirm dispatches `reset-all` (draft) + `reset` (settings) and closes
  the dialog. The settings modal stays open so the user sees values snap
  back to defaults.

### 4. Tests

Extend `tests/draftReducer.test.ts` with a `reset-all` case verifying all
user state clears and rankings survive.

## Error handling

No new failure modes: reducers are synchronous and the storage write path
is the existing one.
