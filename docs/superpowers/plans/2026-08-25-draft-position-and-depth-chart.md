# Draft Position & Player Depth Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a draft-position setting that highlights when it's the user's pick and auto-adds their drafted player to their roster, plus an inline position depth chart in the player details modal.

**Architecture:** All client-side. Pure snake-draft pick math lives in a new `utils/draftPosition.ts`; `settingsReducer` stores `draftPosition`; `DraftProvider` derives `isMyPick`/`nextPick` getters; the `draft` action optionally adds to the roster atomically. The modal depth chart reuses the app-wide `DepthChartsProvider` (no API changes).

**Tech Stack:** Next.js (pages router), React Context + useReducer, Chakra UI v2, vitest (unit tests only — no component test infra, UI is verified in the browser).

**Spec:** `docs/superpowers/specs/2026-08-25-draft-position-and-depth-chart-design.md`

---

### Task 1: Snake pick math helpers

**Files:**
- Create: `utils/draftPosition.ts`
- Create: `tests/draftPosition.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/draftPosition.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getPickInfo, isUsersPick } from '../utils/draftPosition';

describe('getPickInfo', () => {
  it('maps overall picks in round 1', () => {
    expect(getPickInfo(1, 10)).toEqual({ round: 1, pickInRound: 1 });
    expect(getPickInfo(10, 10)).toEqual({ round: 1, pickInRound: 10 });
  });

  it('maps overall picks in later rounds', () => {
    expect(getPickInfo(11, 10)).toEqual({ round: 2, pickInRound: 1 });
    expect(getPickInfo(25, 12)).toEqual({ round: 3, pickInRound: 1 });
  });
});

describe('isUsersPick', () => {
  it('matches the draft position in odd rounds', () => {
    // 10 teams, slot 3: round 1 pick 3 = overall 3
    expect(isUsersPick(3, 10, 3)).toBe(true);
    // round 3 pick 3 = overall 23
    expect(isUsersPick(23, 10, 3)).toBe(true);
    expect(isUsersPick(4, 10, 3)).toBe(false);
  });

  it('reverses the slot in even rounds (snake)', () => {
    // 10 teams, slot 3: round 2 slot = 10 - 3 + 1 = 8 -> overall 18
    expect(isUsersPick(18, 10, 3)).toBe(true);
    expect(isUsersPick(13, 10, 3)).toBe(false);
  });

  it('handles the turn for the last slot', () => {
    // 10 teams, slot 10: back-to-back picks at overall 10 and 11
    expect(isUsersPick(10, 10, 10)).toBe(true);
    expect(isUsersPick(11, 10, 10)).toBe(true);
    expect(isUsersPick(12, 10, 10)).toBe(false);
  });

  it('handles slot 1', () => {
    expect(isUsersPick(1, 10, 1)).toBe(true);
    // round 2 slot for position 1 is pick 10 -> overall 20
    expect(isUsersPick(20, 10, 1)).toBe(true);
  });

  it('returns false for unset or invalid positions', () => {
    expect(isUsersPick(1, 10, null)).toBe(false);
    expect(isUsersPick(1, 10, 0)).toBe(false);
    expect(isUsersPick(1, 10, 11)).toBe(false); // > numTeams: treated as off
    expect(isUsersPick(1, 10, 2.5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/draftPosition.test.ts`
Expected: FAIL — cannot find module `../utils/draftPosition`

- [ ] **Step 3: Write the implementation**

Create `utils/draftPosition.ts`:

```ts
export type PickInfo = { round: number; pickInRound: number };

/** Converts a 1-based overall pick number into round / pick-in-round. */
export function getPickInfo(overall: number, numTeams: number): PickInfo {
  return {
    round: Math.floor((overall - 1) / numTeams) + 1,
    pickInRound: ((overall - 1) % numTeams) + 1,
  };
}

/**
 * Snake order: the user's slot is draftPosition in odd rounds and
 * numTeams - draftPosition + 1 in even rounds. A draftPosition that is
 * unset or outside 1..numTeams (e.g. the league was shrunk after it was
 * set) turns the feature off rather than erroring.
 */
export function isUsersPick(
  overall: number,
  numTeams: number,
  draftPosition: number | null
): boolean {
  if (
    draftPosition == null ||
    !Number.isInteger(draftPosition) ||
    draftPosition < 1 ||
    draftPosition > numTeams
  ) {
    return false;
  }

  const { round, pickInRound } = getPickInfo(overall, numTeams);
  const usersSlot =
    round % 2 === 1 ? draftPosition : numTeams - draftPosition + 1;

  return pickInRound === usersSlot;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/draftPosition.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add utils/draftPosition.ts tests/draftPosition.test.ts
git commit -m "feat: add snake draft pick math helpers"
```

---

### Task 2: `draftPosition` in settings state

**Files:**
- Modify: `providers/settingsReducer.ts`
- Test: `tests/settingsReducer.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/settingsReducer.test.ts`, the existing `reset` test builds a `dirtyState` object; add `draftPosition: 7,` to that object (after `numTeams: 14,`) so it still typechecks once the field exists. Then append:

```ts
describe('set-draft-position', () => {
  it('sets the draft position', () => {
    const result = settingsReducer(
      { ...defaultState, isHydrated: true },
      { type: 'set-draft-position', payload: 5 }
    );

    expect(result.draftPosition).toBe(5);
  });

  it('clears the draft position with null', () => {
    const result = settingsReducer(
      { ...defaultState, isHydrated: true, draftPosition: 5 },
      { type: 'set-draft-position', payload: null }
    );

    expect(result.draftPosition).toBeNull();
  });
});

describe('hydrate draftPosition', () => {
  it('defaults legacy blobs without the key to null', () => {
    const blob = { ...defaultState } as Partial<typeof defaultState>;
    delete blob.draftPosition;

    const result = settingsReducer(defaultState, {
      type: 'hydrate',
      payload: blob as typeof defaultState,
    });

    expect(result.draftPosition).toBeNull();
  });

  it('coerces non-positive-integer values to null', () => {
    for (const bad of [0, -3, 2.5, NaN, 'x' as unknown as number]) {
      const result = settingsReducer(defaultState, {
        type: 'hydrate',
        payload: { ...defaultState, draftPosition: bad },
      });

      expect(result.draftPosition).toBeNull();
    }
  });

  it('keeps a valid stored value, even above numTeams', () => {
    // > numTeams is preserved (not clamped); consumers treat it as off
    const result = settingsReducer(defaultState, {
      type: 'hydrate',
      payload: { ...defaultState, numTeams: 10, draftPosition: 12 },
    });

    expect(result.draftPosition).toBe(12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/settingsReducer.test.ts`
Expected: FAIL — TypeScript/assertion errors: `draftPosition` does not exist on state, unhandled action type

- [ ] **Step 3: Implement in `providers/settingsReducer.ts`**

Add to the `State` type (after `numTeams: number;`):

```ts
  draftPosition: number | null;
```

Add to the `Action` union:

```ts
  | { type: 'set-draft-position'; payload: number | null }
```

Add to `defaultState` (after `numTeams: 10,`):

```ts
  draftPosition: null,
```

In the `hydrate` case, after the `numTeams` normalization and before `newState = action.payload;`:

```ts
        const rawDraftPosition = action.payload.draftPosition;
        action.payload.draftPosition =
          typeof rawDraftPosition === 'number' &&
          Number.isInteger(rawDraftPosition) &&
          rawDraftPosition >= 1
            ? rawDraftPosition
            : null;
```

Add a new case (after `set-num-teams`):

```ts
    case 'set-draft-position':
      newState = { ...state, draftPosition: action.payload };
      break;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/settingsReducer.test.ts`
Expected: PASS (all tests, including the pre-existing `reset` test)

- [ ] **Step 5: Commit**

```bash
git add providers/settingsReducer.ts tests/settingsReducer.test.ts
git commit -m "feat: store draft position in settings"
```

---

### Task 3: Draft position control in the settings modal

**Files:**
- Create: `components/Settings/SettingsDraftPosition.tsx`
- Modify: `components/Settings/Settings.tsx`

No unit test (no component test infra); verified by lint/build here and in the browser in Task 8.

- [ ] **Step 1: Create the component**

Create `components/Settings/SettingsDraftPosition.tsx` (modeled on `SettingsTeams.tsx`):

```tsx
import {
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';

const SettingsDraftPosition = () => {
  const { state, dispatch } = useSettings();

  const handleChange = (_: string, valueNumber: number) => {
    if (isNaN(valueNumber) || valueNumber < 0 || valueNumber > state.numTeams)
      return;

    dispatch({
      type: 'set-draft-position',
      payload: valueNumber === 0 ? null : valueNumber,
    });
  };

  return (
    <FormControl display="flex" alignItems="center" gap={2}>
      <div>
        <FormLabel>Your Draft Position</FormLabel>
        <FormHelperText>
          Your first-round pick slot in a snake draft. Highlights the app when
          you are on the clock and adds your pick to your roster. Set to 0 to
          turn off.
        </FormHelperText>
      </div>
      <NumberInput
        step={1}
        value={state.draftPosition ?? 0}
        min={0}
        max={state.numTeams}
        precision={0}
        onChange={handleChange}
        inputMode="numeric"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FormControl>
  );
};

export default SettingsDraftPosition;
```

- [ ] **Step 2: Mount it in `components/Settings/Settings.tsx`**

Add the import:

```tsx
import SettingsDraftPosition from './SettingsDraftPosition';
```

Render it directly after `<SettingsTeams />`:

```tsx
          <SettingsTeams />
          <SettingsDraftPosition />
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no errors (warnings pre-existing at most)

- [ ] **Step 4: Commit**

```bash
git add components/Settings/SettingsDraftPosition.tsx components/Settings/Settings.tsx
git commit -m "feat: add draft position setting control"
```

---

### Task 4: Atomic auto-roster in the draft action

**Files:**
- Modify: `providers/draftReducer.ts`
- Modify: `components/DraftBoard/DraftBoardRankingRow.tsx` (call site — payload shape changes)
- Test: `tests/draftReducer.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/draftReducer.test.ts`. The file already defines `baseState`; add a player fixture near it if not present:

```ts
import { Player } from '../types';

const playerFixture: Player = {
  id: 'justin_jefferson_WR',
  rank: 1,
  pRank: 1,
  adp: 1,
  name: 'Justin Jefferson',
  position: 'WR',
  isRookie: false,
  team: 'MIN',
};
```

Then:

```ts
describe('draft', () => {
  it('adds the player to draftedPlayers only, by default', () => {
    const result = draftReducer(baseState, {
      type: 'draft',
      payload: { player: playerFixture },
    });

    expect(result.draftedPlayers).toEqual([playerFixture]);
    expect(result.roster).toEqual([]);
  });

  it('also adds to the roster when addToRoster is present', () => {
    const result = draftReducer(baseState, {
      type: 'draft',
      payload: { player: playerFixture, addToRoster: { round: 2, pick: 8 } },
    });

    expect(result.draftedPlayers).toEqual([playerFixture]);
    expect(result.roster).toEqual([{ ...playerFixture, round: 2, pick: 8 }]);
  });

  it('undo removes an auto-rostered pick from both lists', () => {
    const drafted = draftReducer(baseState, {
      type: 'draft',
      payload: { player: playerFixture, addToRoster: { round: 1, pick: 3 } },
    });
    const result = draftReducer(drafted, { type: 'undo' });

    expect(result.draftedPlayers).toEqual([]);
    expect(result.roster).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/draftReducer.test.ts`
Expected: FAIL — the new `draft` tests fail (payload shape mismatch)

- [ ] **Step 3: Implement in `providers/draftReducer.ts`**

Change the `draft` member of the `Action` union from:

```ts
  | {
      type: 'draft';
      payload: Player;
    }
```

to:

```ts
  | {
      type: 'draft';
      payload: {
        player: Player;
        addToRoster?: { round: number; pick: number };
      };
    }
```

Change the `draft` case from:

```ts
    case 'draft':
      newState = {
        ...state,
        draftedPlayers: [action.payload, ...state.draftedPlayers],
      };
      break;
```

to:

```ts
    case 'draft': {
      const { player, addToRoster } = action.payload;
      newState = {
        ...state,
        draftedPlayers: [player, ...state.draftedPlayers],
        // when it's the user's pick, roster the player in the same update
        roster: addToRoster
          ? [...state.roster, { ...player, ...addToRoster }]
          : state.roster,
      };
      break;
    }
```

- [ ] **Step 4: Update the call site in `components/DraftBoard/DraftBoardRankingRow.tsx`**

In `handleDraftPlayer`, change:

```ts
    dispatch({ type: 'draft', payload: player });
```

to:

```ts
    dispatch({ type: 'draft', payload: { player } });
```

(The `addToRoster` wiring lands in Task 5.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/draftReducer.test.ts && npm run lint`
Expected: tests PASS, lint clean

- [ ] **Step 6: Commit**

```bash
git add providers/draftReducer.ts components/DraftBoard/DraftBoardRankingRow.tsx tests/draftReducer.test.ts
git commit -m "feat: support atomic roster add in draft action"
```

---

### Task 5: `isMyPick` / `nextPick` getters and auto-roster wiring

**Files:**
- Modify: `providers/DraftProvider.tsx`
- Modify: `components/DraftBoard/DraftBoardRankingRow.tsx`

Getter logic is a thin composition of the (tested) helpers and reducer; verified via lint here and in the browser in Task 8.

- [ ] **Step 1: Add getters to `providers/DraftProvider.tsx`**

Add to the imports:

```ts
import { getPickInfo, isUsersPick } from 'utils/draftPosition';
```

Add to the getters type in the `createContext` call (after `keeperPlayerIds: Set<string>;`):

```ts
        isMyPick: boolean;
        nextPick: { round: number; pick: number };
```

Inside `DraftProvider`, after the `keeperPlayerIds` memo:

```ts
  // the next overall pick is 1-based: picks made so far + 1. Keepers are
  // not part of draftedPlayers, so they don't shift the count (matches
  // DraftBoardPickRow's round/pick derivation).
  const nextOverallPick = state.draftedPlayers.length + 1;

  const nextPick = useMemo(() => {
    const { round, pickInRound } = getPickInfo(
      nextOverallPick,
      settings.numTeams
    );
    return { round, pick: pickInRound };
  }, [nextOverallPick, settings.numTeams]);

  const isMyPick = useMemo(
    () =>
      isUsersPick(nextOverallPick, settings.numTeams, settings.draftPosition),
    [nextOverallPick, settings.numTeams, settings.draftPosition]
  );
```

Add both to the provider `value` getters object (after `keeperPlayerIds,`):

```ts
          isMyPick,
          nextPick,
```

- [ ] **Step 2: Wire auto-roster in `components/DraftBoard/DraftBoardRankingRow.tsx`**

In `handleDraftPlayer`, change:

```ts
    dispatch({ type: 'draft', payload: { player } });
```

to:

```ts
    dispatch({
      type: 'draft',
      payload: {
        player,
        addToRoster: getters.isMyPick ? getters.nextPick : undefined,
      },
    });
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run lint`
Expected: all tests PASS, lint clean

- [ ] **Step 4: Commit**

```bash
git add providers/DraftProvider.tsx components/DraftBoard/DraftBoardRankingRow.tsx
git commit -m "feat: auto-add user's pick to roster via draft position"
```

---

### Task 6: On-the-clock glow indicator

**Files:**
- Create: `components/MyPickIndicator/index.tsx`
- Modify: `pages/index.tsx`

- [ ] **Step 1: Create the component**

Create `components/MyPickIndicator/index.tsx`:

```tsx
import { Box, keyframes } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';

const pulse = keyframes`
  0%, 100% { box-shadow: inset 0 0 18px 4px var(--chakra-colors-blue-400); }
  50% { box-shadow: inset 0 0 42px 10px var(--chakra-colors-blue-400); }
`;

/**
 * Full-viewport pulsing glow shown while the next overall pick belongs to
 * the user (per the draft position setting). Purely decorative: it never
 * intercepts pointer events and is hidden from assistive tech.
 */
const MyPickIndicator = () => {
  const { getters } = useDraft();

  if (!getters.isMyPick) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex="banner"
      pointerEvents="none"
      animation={`${pulse} 1.6s ease-in-out infinite`}
      aria-hidden
    />
  );
};

export default MyPickIndicator;
```

- [ ] **Step 2: Mount it in `pages/index.tsx`**

Add the import:

```tsx
import MyPickIndicator from 'components/MyPickIndicator';
```

Render it as the last child inside `<Page>` (after `<Roster />`):

```tsx
      <Roster />
      <MyPickIndicator />
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add components/MyPickIndicator/index.tsx pages/index.tsx
git commit -m "feat: glow indicator when it's the user's pick"
```

---

### Task 7: Depth chart section in player details

**Files:**
- Create: `components/DraftBoard/PlayerDepthChart.tsx`
- Modify: `components/DraftBoard/PlayerDetailsModal.tsx`

- [ ] **Step 1: Create the component**

Create `components/DraftBoard/PlayerDepthChart.tsx`:

```tsx
import { Divider, Flex, Heading, Text } from '@chakra-ui/react';
import { useDepthCharts } from 'providers/DepthChartsProvider';
import { normalizePlayerName } from 'utils/projections';
import { Player, Position } from 'types';

// depth charts only exist for skill positions (see utils/depthCharts.ts)
const DEPTH_CHART_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];

type PlayerDepthChartProps = {
  player: Player;
  team: string | null;
};

/**
 * The player's team depth chart at their position, with the viewed player
 * highlighted. Nice-to-have data: renders nothing while loading, on error,
 * or when there's no chart for the team/position.
 */
const PlayerDepthChart = (props: PlayerDepthChartProps) => {
  const {
    state: { depthCharts },
    getters: { isLoading, isError },
  } = useDepthCharts();

  if (isLoading || isError || !props.team) return null;
  if (!DEPTH_CHART_POSITIONS.includes(props.player.position)) return null;

  const teamChart = depthCharts.find((chart) => chart.team === props.team);
  const positionPlayers =
    teamChart?.players.filter(
      (entry) => entry.pos === props.player.position
    ) ?? [];

  if (positionPlayers.length === 0) return null;

  // ids on both sides come from parseId, but Sleeper and Boris Chen spell
  // some names differently ("Marvin Harrison" vs "Marvin Harrison Jr."),
  // so fall back to normalized-name matching — same trick the depth
  // charts page uses.
  const normalizedName = normalizePlayerName(props.player.name);

  return (
    <>
      <Divider marginY={6} />
      <Heading as="h3" size="sm" marginBottom={4}>
        {props.team} {props.player.position} Depth Chart
      </Heading>
      <Flex flexDirection="column" gap={2}>
        {positionPlayers.map((entry, index) => {
          const isViewedPlayer =
            entry.id === props.player.id ||
            normalizePlayerName(entry.name) === normalizedName;

          return (
            <Flex key={entry.id} gap={3} alignItems="baseline">
              <Text
                flexShrink={0}
                flexBasis={5}
                textAlign="right"
                color="whiteAlpha.700"
                fontSize="sm"
              >
                {index + 1}
              </Text>
              <Text
                fontWeight={isViewedPlayer ? 'bold' : 'normal'}
                color={isViewedPlayer ? 'blue.200' : undefined}
              >
                {entry.name}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </>
  );
};

export default PlayerDepthChart;
```

- [ ] **Step 2: Integrate into `components/DraftBoard/PlayerDetailsModal.tsx`**

Add the import:

```tsx
import PlayerDepthChart from 'components/DraftBoard/PlayerDepthChart';
```

`DetailsBody` needs the ranking `Player` (for id/position). Change its signature from:

```tsx
const DetailsBody = (props: { details: PlayerDetails }) => {
  const { details } = props;
```

to:

```tsx
const DetailsBody = (props: { details: PlayerDetails; player: Player }) => {
  const { details } = props;
```

Inside `DetailsBody`, render the section between the stats `SimpleGrid` and the news block — directly after the closing `</SimpleGrid>`:

```tsx
      <PlayerDepthChart
        player={props.player}
        team={details.team ?? props.player.team ?? null}
      />
```

Update the call site in `PlayerDetailsModal` from:

```tsx
          {query.data ? (
            <DetailsBody details={query.data} />
          ) : (
```

to:

```tsx
          {query.data && activePlayer ? (
            <DetailsBody details={query.data} player={activePlayer} />
          ) : (
```

(`query.data` implies `activePlayer` — the query only runs with a player — so this guard is for the type system, not a behavior change.)

- [ ] **Step 3: Verify**

Run: `npm test && npm run lint`
Expected: all tests PASS, lint clean

- [ ] **Step 4: Commit**

```bash
git add components/DraftBoard/PlayerDepthChart.tsx components/DraftBoard/PlayerDetailsModal.tsx
git commit -m "feat: show position depth chart in player details"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full test suite and lint**

Run: `npm test && npm run lint`
Expected: all suites PASS, lint clean

- [ ] **Step 2: Browser verification (dev server)**

Start the dev server (`.claude/launch.json` / preview tools — not Bash) and check:

1. Settings modal shows "Your Draft Position" bounded 0..numTeams; setting persists across reload (localStorage).
2. With numTeams=10 and position 3: glow is absent initially, appears after drafting 2 players (overall pick 3 is yours), disappears after you draft the 3rd.
3. That 3rd player lands on your roster automatically with pick `1.3`; the picks-list checkbox shows checked; un-toggling removes it.
4. Snake turn: keep drafting to overall pick 18 (round 2, slot 8 for position 3) — glow reappears there.
5. Undo after an auto-rostered pick removes it from roster and picks.
6. With position 0/off: no glow, drafting never auto-rosters.
7. Player details for a skill player (e.g. an RB): depth chart section lists team RBs in order with the player highlighted; a DST/K shows no section.
8. No console errors.

- [ ] **Step 3: Fix anything found, re-run, commit fixes**

```bash
git add -A
git commit -m "fix: address issues found in browser verification"
```

(Skip the commit if nothing was found.)
