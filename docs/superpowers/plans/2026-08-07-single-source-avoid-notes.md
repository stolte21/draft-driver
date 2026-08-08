# Single Data Source, Avoid Players, Player Notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the data-source setting (Boris Chen becomes the only rankings source), add a mutually-exclusive "avoided" counterpart to favorites, and add per-player notes — all persisted to localStorage like existing state.

**Architecture:** State lives in two React contexts (`SettingsProvider`, `DraftProvider`); each reducer persists to localStorage on every action and hydrates/validates on mount. New state (`avoided`, `notes`) follows the existing `favorites` pattern in `DraftProvider`. The draft reducer is extracted to a leaf module so it can be unit-tested with vitest (node environment).

**Tech Stack:** Next.js (pages router), React Context + useReducer, Chakra UI, react-window (virtualized lists), vitest.

**Spec:** `docs/superpowers/specs/2026-08-07-single-source-avoid-notes-design.md`

**Branch:** `feat/single-source-avoid-notes` (already created; spec is committed on it)

---

## File Structure

| File | Change |
| --- | --- |
| `components/Settings/SettingsDataSource.tsx` | **Delete** |
| `components/Settings/Settings.tsx` | Remove data-source usage |
| `providers/SettingsProvider.tsx` | Drop `dataSource` state + action |
| `hooks/useRankings.ts` | Drop `dataSource` option |
| `providers/DraftProvider.tsx` | Slim down: reducer moves out; add `avoided`/`notes` wiring |
| `providers/draftReducer.ts` | **Create** — extracted reducer + `State`/`Action` types |
| `pages/api/rankings.ts` | Boris-only; remove `src` param |
| `types/index.ts` | Remove `DataSource` |
| `utils/index.ts` | Remove `dataSourcesList`, `getRankingsName` |
| `utils/storage.ts` | Fix broken SSR guard (needed for node-env tests) |
| `components/StaleRankingsBanner.tsx` | Remove data-source condition |
| `components/AppBar/index.tsx` | Hardcode "Boris Chen" label |
| `components/DraftBoard/DraftBoardRankingRow.tsx` | New menu items, avoid dim + icon, note icon |
| `components/DraftBoard/DraftBoardList.tsx` | Own the note modal; thread `onEditNote` |
| `components/DraftBoard/PlayerNoteModal.tsx` | **Create** |
| `components/Icons/NoteIcon.tsx` | **Create** |
| `tests/draftReducer.test.ts` | **Create** — reducer unit tests |
| `CLAUDE.md` | Update docs at the end |

---

### Task 1: Remove the data source concept

No new behavior — pure removal. `buildAdpRankings` survives (it feeds the ADP/team/rookie merge). No tests to write; verification is build + lint + existing tests.

**Files:**
- Delete: `components/Settings/SettingsDataSource.tsx`
- Modify: `components/Settings/Settings.tsx`, `providers/SettingsProvider.tsx`, `hooks/useRankings.ts`, `providers/DraftProvider.tsx`, `components/StaleRankingsBanner.tsx`, `components/AppBar/index.tsx`, `pages/api/rankings.ts`, `utils/index.ts`, `types/index.ts`

- [ ] **Step 1: Delete the settings control**

```bash
rm components/Settings/SettingsDataSource.tsx
```

In `components/Settings/Settings.tsx`, remove the import line `import SettingsDataSource from './SettingsDataSource';` and replace the `<Box display="flex" ...>` wrapper (which existed only to lay out Format + DataSource side by side) with a bare `<SettingsFormat />`:

```tsx
      <SettingsModal isOpen={isOpen} onClose={onClose}>
        <Flex direction="column" gap={4}>
          <SettingsFormat />
          <SettingsHidePlayersSwitch />
          <SettingsScarcitySwitch />
          <SettingsTeams />
          <SettingsRoster />
        </Flex>
      </SettingsModal>
```

Also remove the now-unused `Box` from the `@chakra-ui/react` import in that file.

- [ ] **Step 2: Remove `dataSource` from SettingsProvider**

In `providers/SettingsProvider.tsx`:

1. Imports — remove `dataSourcesList` from the `utils` import and `DataSource` from the `types` import:

```ts
import {
  getStorageItem,
  setStorageItem,
  formatsList,
  positionsForFantasyList,
} from 'utils';
import { Position, Format } from 'types';
```

2. `State` — delete the `dataSource: DataSource;` line.
3. `Action` — delete the `| { type: 'change-data-source'; payload: DataSource }` line.
4. In the `hydrate` case, replace the `action.payload.dataSource = ...` validation block with a strip of the stray key (old localStorage blobs still carry it):

```ts
        // legacy blobs may still carry a dataSource key — drop it
        delete (action.payload as { dataSource?: unknown }).dataSource;
```

5. Delete the entire `case 'change-data-source':` block.
6. In the `useReducer` initial state, delete the `dataSource: 'boris',` line.

- [ ] **Step 3: Remove `dataSource` from useRankings and its call site**

Replace `hooks/useRankings.ts` with:

```ts
import { useQuery } from '@tanstack/react-query';
import { Format, Player } from 'types';

type UseRankingsOptions = {
  isEnabled: boolean;
  format: Format;
};

type RankingsResult = {
  players: Player[];
  lastModified?: string;
};

function useRankings(options: UseRankingsOptions) {
  return useQuery<RankingsResult>({
    queryKey: ['rankings', options.format],
    queryFn: async () => {
      const response = await fetch(`/api/rankings?format=${options.format}`);

      if (!response.ok) {
        throw new Error('There was an error fetching fantasy rankings');
      }

      const players: Player[] = await response.json();
      return {
        players,
        lastModified: response.headers.get('x-rankings-last-modified') ?? undefined,
      };
    },
    enabled: options.isEnabled,
    staleTime: Infinity,
  });
}

export default useRankings;
```

In `providers/DraftProvider.tsx`, the `useRankings` call drops the `dataSource` line:

```ts
  const { data: rankingsData, isPending } = useRankings({
    isEnabled: state.isHydrated,
    format: settings.format,
  });
```

- [ ] **Step 4: Fix the two display components**

Replace `components/StaleRankingsBanner.tsx` with (drops `useSettings` and `getRankingsName`):

```tsx
import { Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';
import { areRankingsStale } from 'utils';

const StaleRankingsBanner = () => {
  const { getters } = useDraft();
  const lastModified = getters.rankingsLastModified;

  if (!areRankingsStale(lastModified, new Date())) return null;

  const formatted = new Date(lastModified!).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Alert status="warning" rounded="md" marginBottom={2} paddingY={1}>
      <AlertIcon />
      <AlertDescription fontSize="sm">
        Boris Chen rankings were last updated {formatted} and may be from a
        previous season.
      </AlertDescription>
    </Alert>
  );
};

export default StaleRankingsBanner;
```

In `components/AppBar/index.tsx`, change the `utils` import to `import { getFormatName } from 'utils';` and the label to:

```tsx
              <Text as="span" fontWeight="medium">
                Boris Chen {getFormatName(state.format)}
              </Text>
```

- [ ] **Step 5: Make the API Boris-only**

In `pages/api/rankings.ts`:

1. Imports — remove `dataSourcesList` from `utils`, remove `DataSource` from `types`.
2. Delete the whole `validateDataSource` function.
3. Replace `parseVsAdp` with (no `dataSource` param):

```ts
function parseVsAdp(
  ranking: ScrapedRanking,
  playerMap: Map<string, ScrapedRanking>
) {
  // vsAdp compares the boris rank to the sleeper-derived adp rank
  const player = playerMap.get(normalizePlayerName(ranking.name));
  if (player) {
    return player.rank - ranking.rank;
  }
}
```

4. In `handler`, delete `const dataSource = validateDataSource(req.query);` and simplify the fetch (Boris is always fetched; the `ProjectedPlayer` import stays for the catch handler):

```ts
  try {
    const [borisData, projections] = await Promise.all([
      fetchBorisData(format),
      // projections are an enhancement — rankings must still work without them
      fetchProjections().catch((error): ProjectedPlayer[] => {
        console.error('Failed to fetch projections:', error);
        return [];
      }),
    ]);

    borisLastModified = borisData.lastModified;

    // the adp rankings (derived from sleeper projections) provide team/adp/
    // rookie info that gets merged into the boris rankings
    const adpRankings = buildAdpRankings(projections, format);

    const rankingsToUse: ScrapedRanking[] = borisData.rankings;
```

5. The K/DST backfill block loses its `if (dataSource === 'boris') { ... }` wrapper — keep its contents unconditional (the `nextHighestTier` / `defensesAndKickers` / `dstAndKProjections` logic is unchanged).
6. The player-push loop changes one line: `vsAdp: parseVsAdp(ranking, playerMap),`.
7. The response header condition drops the source check:

```ts
  if (borisLastModified) {
    res.setHeader('x-rankings-last-modified', borisLastModified);
  }
```

Note: the `ScrapedRanking` promise-typing on the old `Promise.resolve` branch disappears with the branch itself.

- [ ] **Step 6: Remove the type and utils**

In `types/index.ts`, delete the line `export type DataSource = 'boris' | 'fp';`.

In `utils/index.ts`:
1. Remove `DataSource` from the `types` import.
2. Delete `export const dataSourcesList: DataSource[] = ['fp', 'boris'];`.
3. Delete the whole `getRankingsName` function.

- [ ] **Step 7: Verify nothing references data sources anymore**

```bash
grep -rn "dataSource\|DataSource\|dataSourcesList\|getRankingsName\|'fp'" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v docs/
```

Expected: no output. (Fix any stragglers it finds.)

- [ ] **Step 8: Build, lint, test**

```bash
npm run build && npm run lint && npm test
```

Expected: build succeeds, no lint errors, 4 existing test files pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: remove data source selection, Boris Chen is the only rankings source"
```

---

### Task 2: Fix storage SSR guard and extract the draft reducer

Pure refactor to make the reducer unit-testable. `utils/storage.ts` currently checks `typeof window === undefined` — comparing the *string* `typeof` returns against `undefined`, which is always false — so under vitest's node environment `window.localStorage` throws a ReferenceError. Fix the guard to a proper no-op, then move the reducer to a leaf module (`DraftProvider.tsx` imports `hooks/useRankings`, which vitest's alias config can't resolve; a leaf module only needs the existing `utils`/`types` aliases).

**Files:**
- Modify: `utils/storage.ts`
- Create: `providers/draftReducer.ts`
- Modify: `providers/DraftProvider.tsx`

- [ ] **Step 1: Fix the guards in `utils/storage.ts`**

Replace both function bodies' guard lines:

```ts
export const setStorageItem = (key: keyof typeof StorageKeyMap, value: any) => {
  if (typeof window === 'undefined') return;

  const storageKey = `${STORAGE_PREFIX}${StorageKeyMap[key]}`;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

export const getStorageItem = (key: keyof typeof StorageKeyMap) => {
  if (typeof window === 'undefined') return null;

  const storageKey = `${STORAGE_PREFIX}${StorageKeyMap[key]}`;
  const value = window.localStorage.getItem(storageKey);
  return value ? JSON.parse(value) : null;
};
```

- [ ] **Step 2: Create `providers/draftReducer.ts`**

Move `State`, `Action`, `Dispatch`, and `draftReducer` out of `DraftProvider.tsx` **verbatim** (post-Task-1 state — no `dataSource` anywhere) and export them:

```ts
import { Reducer } from 'react';
import { setStorageItem } from 'utils';
import { Player, RosteredPlayer } from 'types';

export type State = {
  isHydrated: boolean;
  filter: string;
  rankings: Player[];
  rankingsLastModified?: string;
  draftedPlayers: Player[];
  roster: RosteredPlayer[];
  favorites: Player['id'][];
  keepers: Player[];
};

export type Action =
  | { type: 'hydrate'; payload: State | null }
  | { type: 'update-filter'; payload: string }
  | {
      type: 'set-rankings';
      payload: { players: Player[]; lastModified?: string };
    }
  | {
      type: 'draft';
      payload: Player;
    }
  | { type: 'undo' }
  | { type: 'reset' }
  | {
      type: 'add-roster';
      payload: { player: Player; round: number; pick: number };
    }
  | { type: 'remove-roster'; payload: string }
  | { type: 'toggle-favorite'; payload: Player['id'] }
  | { type: 'add-keeper'; payload: Player }
  | { type: 'remove-keeper'; payload: Player['id'] };

export type Dispatch = (action: Action) => void;

export const draftReducer: Reducer<State, Action> = (state, action) => {
  // ... the existing reducer body from DraftProvider.tsx, moved verbatim,
  // including the trailing localStorage persistence block:
  //   const stateCopy: Partial<State> = { ...newState };
  //   delete stateCopy.rankings; ...
  //   setStorageItem('DRAFT', stateCopy);
  //   return newState;
};
```

(The reducer body is ~120 lines and moves unchanged — copy it exactly, from `let newState: null | State = null;` through `return newState;`.)

- [ ] **Step 3: Slim down `DraftProvider.tsx`**

Remove the moved code and import it instead. The top of the file becomes:

```tsx
import {
  useEffect,
  useReducer,
  useContext,
  useMemo,
  createContext,
  ReactNode,
} from 'react';
import { useSettings } from 'providers/SettingsProvider';
import useRankings from 'hooks/useRankings';
import { positionsList, flexPositionsList } from 'utils';
import { Player, RosteredPlayer, Position } from 'types';
import { draftReducer, State, Dispatch } from './draftReducer';

type PlayersMap = Record<string, Player>;
```

(`useState`, `Reducer`, `getStorageItem`/`setStorageItem` imports go away or move; note `getStorageItem` is still needed for the hydrate effect — keep it: `import { getStorageItem, positionsList, flexPositionsList } from 'utils';`.)

Everything else in the provider component stays as-is.

- [ ] **Step 4: Verify**

```bash
npm run build && npm test
```

Expected: build succeeds, existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: extract draftReducer to a leaf module; fix broken SSR guard in storage"
```

---

### Task 3: Avoided players — state (TDD)

**Files:**
- Test: `tests/draftReducer.test.ts` (create)
- Modify: `providers/draftReducer.ts`, `providers/DraftProvider.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/draftReducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { draftReducer, State } from '../providers/draftReducer';

const baseState: State = {
  isHydrated: true,
  filter: '',
  rankings: [],
  draftedPlayers: [],
  roster: [],
  favorites: [],
  avoided: [],
  keepers: [],
};

describe('toggle-avoid', () => {
  it('adds a player to avoided', () => {
    const result = draftReducer(baseState, {
      type: 'toggle-avoid',
      payload: 'p1',
    });

    expect(result.avoided).toEqual(['p1']);
  });

  it('removes an already-avoided player', () => {
    const state = { ...baseState, avoided: ['p1', 'p2'] };
    const result = draftReducer(state, { type: 'toggle-avoid', payload: 'p1' });

    expect(result.avoided).toEqual(['p2']);
  });

  it('removes the player from favorites when avoiding', () => {
    const state = { ...baseState, favorites: ['p1', 'p2'] };
    const result = draftReducer(state, { type: 'toggle-avoid', payload: 'p1' });

    expect(result.avoided).toEqual(['p1']);
    expect(result.favorites).toEqual(['p2']);
  });
});

describe('toggle-favorite', () => {
  it('removes the player from avoided when favoriting', () => {
    const state = { ...baseState, avoided: ['p1', 'p2'] };
    const result = draftReducer(state, {
      type: 'toggle-favorite',
      payload: 'p1',
    });

    expect(result.favorites).toEqual(['p1']);
    expect(result.avoided).toEqual(['p2']);
  });
});

describe('hydrate', () => {
  it('falls back to an empty avoided list on legacy blobs', () => {
    const legacyBlob = { ...baseState } as Partial<State>;
    delete legacyBlob.avoided;

    const result = draftReducer(baseState, {
      type: 'hydrate',
      payload: legacyBlob as State,
    });

    expect(result.avoided).toEqual([]);
    expect(result.isHydrated).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/draftReducer.test.ts
```

Expected: FAIL — TypeScript/runtime errors because `avoided` is not in `State` and `toggle-avoid` hits the `Unhandled action type` throw.

- [ ] **Step 3: Implement in `providers/draftReducer.ts`**

1. `State` gains:

```ts
  avoided: Player['id'][];
```

2. `Action` gains:

```ts
  | { type: 'toggle-avoid'; payload: Player['id'] }
```

3. In the `hydrate` case, next to the existing `favorites` validation:

```ts
        newState.avoided = Array.isArray(newState.avoided)
          ? newState.avoided
          : [];
```

4. Replace the `toggle-favorite` case and add `toggle-avoid` (braces added; each toggle strips the id from the opposite list so a player is favorited, avoided, or neither — never both):

```ts
    case 'toggle-favorite': {
      const newFavorites = [...state.favorites];
      const playerIndex = newFavorites.indexOf(action.payload);

      if (playerIndex === -1) {
        newFavorites.push(action.payload);
      } else {
        newFavorites.splice(playerIndex, 1);
      }

      newState = {
        ...state,
        favorites: newFavorites,
        avoided: state.avoided.filter((id) => id !== action.payload),
      };
      break;
    }
    case 'toggle-avoid': {
      const newAvoided = [...state.avoided];
      const playerIndex = newAvoided.indexOf(action.payload);

      if (playerIndex === -1) {
        newAvoided.push(action.payload);
      } else {
        newAvoided.splice(playerIndex, 1);
      }

      newState = {
        ...state,
        avoided: newAvoided,
        favorites: state.favorites.filter((id) => id !== action.payload),
      };
      break;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/draftReducer.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Wire through `DraftProvider.tsx`**

1. Initial `useReducer` state gains `avoided: [],`.
2. Add a memoized getter next to `favoritePlayerIds`:

```ts
  const avoidedPlayerIds = useMemo(() => {
    return new Set(state.avoided);
  }, [state.avoided]);
```

3. Add `avoidedPlayerIds: Set<string>;` to the context type's `getters` (right after `favoritePlayerIds`), and `avoidedPlayerIds,` to the `getters` object in the provider's JSX.

- [ ] **Step 6: Full verify + commit**

```bash
npm run build && npm test
```

Expected: build succeeds, all tests pass.

```bash
git add -A
git commit -m "feat: add avoided-players state, mutually exclusive with favorites"
```

---

### Task 4: Avoided players — menu and row UI

**Files:**
- Modify: `components/DraftBoard/DraftBoardRankingRow.tsx`

- [ ] **Step 1: Update the row component**

In `DraftBoardRankingRow.tsx`:

1. Add to the icon imports: `import { AddIcon, NotAllowedIcon } from '@chakra-ui/icons';`
2. Next to `isPlayerFavorite`:

```ts
  const isPlayerAvoided = getters.avoidedPlayerIds.has(player.id);
```

3. Dim avoided rows — add an `opacity` prop to the `<MenuButton>` (the draft button keeps full opacity):

```tsx
          <MenuButton
            height="100%"
            width="100%"
            display="flex"
            textAlign="left"
            opacity={isPlayerAvoided ? 0.45 : 1}
```

4. In the name `<Text>`, after the `isPlayerFavorite` heart block, add the not-allowed marker (states are mutually exclusive, so the slot is never contested):

```tsx
              {isPlayerAvoided && (
                <NotAllowedIcon
                  verticalAlign="super"
                  color="red.300"
                  marginLeft={2}
                  fontSize="xs"
                />
              )}
```

5. Replace the "Toggle Favorite" `<MenuItem>` with state-aware Favorite/Avoid items (both always visible; picking the opposite action switches the player — the reducer clears the other list):

```tsx
          <MenuItem
            onClick={() =>
              dispatch({ type: 'toggle-favorite', payload: player.id })
            }
          >
            {isPlayerFavorite ? 'Unfavorite' : 'Favorite'}
          </MenuItem>
          <MenuItem
            onClick={() => dispatch({ type: 'toggle-avoid', payload: player.id })}
          >
            {isPlayerAvoided ? 'Unavoid' : 'Avoid'}
          </MenuItem>
```

("Add Keeper" stays below them.)

- [ ] **Step 2: Verify in the app**

```bash
npm run dev
```

Check at http://localhost:3000:
- Row menu on a neutral player shows **Favorite / Avoid / Add Keeper**.
- Avoid a player → row dims, 🚫 icon appears, menu now reads **Favorite / Unavoid**.
- Favorite that avoided player → dim/🚫 cleared, heart appears, menu reads **Unfavorite / Avoid**.
- Avoid a favorited player → heart replaced by 🚫.
- Reload the page → avoided state persists.

- [ ] **Step 3: Build, lint, commit**

```bash
npm run build && npm run lint
```

```bash
git add -A
git commit -m "feat: avoid/favorite menu actions with dimmed rows and not-allowed marker"
```

---

### Task 5: Player notes — state (TDD)

**Files:**
- Test: `tests/draftReducer.test.ts`
- Modify: `providers/draftReducer.ts`, `providers/DraftProvider.tsx`

- [ ] **Step 1: Write the failing tests**

In `tests/draftReducer.test.ts`, add `notes: {},` to `baseState` (after `avoided: [],`) and append:

```ts
describe('set-note', () => {
  it('adds a note for a player', () => {
    const result = draftReducer(baseState, {
      type: 'set-note',
      payload: { id: 'p1', note: 'great value in round 3' },
    });

    expect(result.notes).toEqual({ p1: 'great value in round 3' });
  });

  it('replaces an existing note', () => {
    const state = { ...baseState, notes: { p1: 'old note' } };
    const result = draftReducer(state, {
      type: 'set-note',
      payload: { id: 'p1', note: 'new note' },
    });

    expect(result.notes).toEqual({ p1: 'new note' });
  });

  it('deletes the note when set to an empty string', () => {
    const state = { ...baseState, notes: { p1: 'old note', p2: 'keep' } };
    const result = draftReducer(state, {
      type: 'set-note',
      payload: { id: 'p1', note: '' },
    });

    expect(result.notes).toEqual({ p2: 'keep' });
  });

  it('deletes the note when set to whitespace only', () => {
    const state = { ...baseState, notes: { p1: 'old note' } };
    const result = draftReducer(state, {
      type: 'set-note',
      payload: { id: 'p1', note: '   \n' },
    });

    expect(result.notes).toEqual({});
  });

  it('survives a draft reset', () => {
    const state = { ...baseState, notes: { p1: 'keep me' }, avoided: ['p2'] };
    const result = draftReducer(state, { type: 'reset' });

    expect(result.notes).toEqual({ p1: 'keep me' });
    expect(result.avoided).toEqual(['p2']);
  });
});

describe('hydrate notes', () => {
  it('falls back to an empty notes object on legacy blobs', () => {
    const legacyBlob = { ...baseState } as Partial<State>;
    delete legacyBlob.notes;

    const result = draftReducer(baseState, {
      type: 'hydrate',
      payload: legacyBlob as State,
    });

    expect(result.notes).toEqual({});
  });

  it('falls back to an empty notes object on malformed values', () => {
    const blob = { ...baseState, notes: ['not', 'an', 'object'] };

    const result = draftReducer(baseState, {
      type: 'hydrate',
      payload: blob as unknown as State,
    });

    expect(result.notes).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/draftReducer.test.ts
```

Expected: FAIL — `set-note` hits the `Unhandled action type` throw; hydrate tests fail on missing validation.

- [ ] **Step 3: Implement in `providers/draftReducer.ts`**

1. `State` gains:

```ts
  notes: Record<Player['id'], string>;
```

2. `Action` gains:

```ts
  | { type: 'set-note'; payload: { id: Player['id']; note: string } }
```

3. In the `hydrate` case, next to the `avoided` validation:

```ts
        newState.notes =
          newState.notes &&
          typeof newState.notes === 'object' &&
          !Array.isArray(newState.notes)
            ? newState.notes
            : {};
```

4. New case (empty/whitespace-only notes delete the key so storage doesn't accumulate blanks):

```ts
    case 'set-note': {
      const newNotes = { ...state.notes };
      const trimmedNote = action.payload.note.trim();

      if (trimmedNote === '') {
        delete newNotes[action.payload.id];
      } else {
        newNotes[action.payload.id] = trimmedNote;
      }

      newState = { ...state, notes: newNotes };
      break;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/draftReducer.test.ts
```

Expected: PASS (12 tests).

- [ ] **Step 5: Wire through `DraftProvider.tsx`**

Initial `useReducer` state gains `notes: {},`. (No getter needed — rows read `state.notes[player.id]` directly off context state.)

- [ ] **Step 6: Full verify + commit**

```bash
npm run build && npm test
```

```bash
git add -A
git commit -m "feat: add persisted per-player notes state"
```

---

### Task 6: Player notes — modal, menu item, row indicator

Rows live in a virtualized `react-window` list and unmount on scroll, so the modal is owned by `DraftBoardList`; rows get an `onEditNote(player)` callback via the list's `itemData`.

**Files:**
- Create: `components/Icons/NoteIcon.tsx`, `components/DraftBoard/PlayerNoteModal.tsx`
- Modify: `components/DraftBoard/DraftBoardList.tsx`, `components/DraftBoard/DraftBoardRankingRow.tsx`

- [ ] **Step 1: Create `components/Icons/NoteIcon.tsx`**

Follows the `HeartIcon` `createIcon` pattern (sticky note with a folded corner):

```tsx
import { createIcon } from '@chakra-ui/react';

const NoteIcon = createIcon({
  displayName: 'NoteIcon',
  viewBox: '0 0 24 24',
  defaultProps: {
    fill: 'currentcolor',
  },
  path: (
    <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v9h-5a2 2 0 0 0-2 2v5H4a1 1 0 0 1-1-1V4zm13 15.586V16a1 1 0 0 1 1-1h4.586L16 19.586z" />
  ),
});

export default NoteIcon;
```

- [ ] **Step 2: Create `components/DraftBoard/PlayerNoteModal.tsx`**

```tsx
import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Textarea,
} from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';
import { Player } from 'types';

type PlayerNoteModalProps = {
  player: Player | null;
  onClose: () => void;
};

const PlayerNoteModal = (props: PlayerNoteModalProps) => {
  const { state, dispatch } = useDraft();
  const [note, setNote] = useState('');

  // re-seed the textarea whenever the modal opens for a player
  useEffect(() => {
    if (props.player) {
      setNote(state.notes[props.player.id] ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.player]);

  const handleSave = () => {
    if (props.player) {
      dispatch({
        type: 'set-note',
        payload: { id: props.player.id, note },
      });
    }
    props.onClose();
  };

  return (
    <Modal
      isOpen={props.player !== null}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Note: {props.player?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type a note about this player…"
            rows={5}
            autoFocus
          />
        </ModalBody>

        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PlayerNoteModal;
```

(Saving an emptied textarea deletes the note — the reducer handles that.)

- [ ] **Step 3: Own the modal in `DraftBoardList.tsx`**

1. Add imports:

```tsx
import PlayerNoteModal from 'components/DraftBoard/PlayerNoteModal';
```

2. Add state next to `positionFilters`:

```tsx
  const [notePlayer, setNotePlayer] = useState<Player | null>(null);
```

3. Thread the callback through `itemData`:

```tsx
                itemData={{
                  players: filteredPlayers,
                  onEditNote: setNotePlayer,
                }}
```

4. Render the modal once, inside the root `<Flex>` after the `<Box height="100%" ...>` block, only for the rankings list:

```tsx
      {props.variant === 'rankings' && (
        <PlayerNoteModal
          player={notePlayer}
          onClose={() => setNotePlayer(null)}
        />
      )}
```

(Pick/keeper rows ignore the extra `itemData` key — their props types only declare `players`.)

- [ ] **Step 4: Menu item + indicator in `DraftBoardRankingRow.tsx`**

1. Add imports:

```tsx
import { Tooltip } from '@chakra-ui/react'; // add to the existing @chakra-ui/react import list
import NoteIcon from 'components/Icons/NoteIcon';
```

2. Extend the row props type:

```tsx
type DraftBoardRankingRowProps = {
  players: Player[];
  onEditNote: (player: Player) => void;
};
```

3. Pull `state` off the context and read the note:

```tsx
  const { state, getters, dispatch } = useDraft();
  ...
  const playerNote = state.notes[player.id];
```

4. In the name `<Text>`, after the heart/not-allowed markers:

```tsx
              {playerNote && (
                <Tooltip label={playerNote}>
                  <NoteIcon
                    verticalAlign="super"
                    color="yellow.200"
                    marginLeft={2}
                    fontSize="xs"
                  />
                </Tooltip>
              )}
```

5. New `<MenuItem>` after the Avoid item (before "Add Keeper"):

```tsx
          <MenuItem onClick={() => props.data.onEditNote(player)}>
            {playerNote ? 'Edit Note' : 'Add Note'}
          </MenuItem>
```

- [ ] **Step 5: Verify in the app**

```bash
npm run dev
```

Check at http://localhost:3000:
- Menu shows **Add Note** → dialog opens with the player's name, empty textarea.
- Save a note → menu now reads **Edit Note**, note icon appears on the row, hover shows the note.
- Edit Note → textarea pre-filled; clearing it and saving removes the icon.
- Reload → note persists.
- Scroll the list far away and back → indicator still correct (virtualization sanity check).

- [ ] **Step 6: Build, lint, test, commit**

```bash
npm run build && npm run lint && npm test
```

```bash
git add -A
git commit -m "feat: per-player notes with edit dialog and row indicator tooltip"
```

---

### Task 7: Update project docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`**

1. **Core Data Flow** — replace the two-source framing: Boris Chen is the only rankings source; Sleeper projections remain as an enhancement (projectedPoints, ADP, teams, rookies). Delete the sentence claiming the "ADP" (`fp`) data source exists.
2. **API Layer** — drop "and data source" from validation; drop "from selected source"; the K/DST backfill note loses "when using Boris data".
3. **State Management** — note `SettingsProvider` no longer holds a data source; mention `DraftProvider` also tracks `avoided` players (mutually exclusive with favorites) and per-player `notes`.
4. **Data Types** — remove the `DataSource` bullet.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for single data source, avoid, and notes"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full check**

```bash
npm run build && npm run lint && npm test
```

Expected: all green.

- [ ] **Step 2: Leftover scan**

```bash
grep -rn "Toggle Favorite\|change-data-source\|SettingsDataSource" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v docs/
```

Expected: no output.

- [ ] **Step 3: Manual smoke test of all three features together**

Run `npm run dev` and in one session: avoid a player, favorite another, add a note to a third, draft a fourth, reload — all four states must persist and render correctly (dim + 🚫, heart, note icon + tooltip, drafted strikethrough), and the app bar reads "Boris Chen <format>".
