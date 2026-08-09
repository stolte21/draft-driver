# Depth Charts Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale FantasyPros HTML snapshot with live Sleeper depth chart data, rename WSH→WAS, and add sticky navigation (toolbar with search, sticky team headers, side index rail) to `/depth-charts`.

**Architecture:** A new `utils/depthCharts.ts` fetches Sleeper's players endpoint (24h in-memory cache + dev-only disk cache) and transforms it into the existing `DepthChart[]` shape, so the client-side rank/ADP merge is untouched. UI changes are contained to `features/depth-charts/`.

**Tech Stack:** Next.js (pages router), Chakra UI v2, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-09-depth-charts-refresh-design.md`

**Branch:** `depth-charts-refresh`

---

### Task 1: Sleeper → DepthChart transform (pure function, TDD)

The transform is a pure function over the Sleeper players map so it's unit-testable without network.

**Files:**
- Create: `utils/depthCharts.ts`
- Create: `tests/depthCharts.test.ts`
- Modify: `types/index.ts:36` (make `ecr` optional — transitional until Task 3 deletes `utils/scrape.ts`, which still sets it)

**Context for the engineer:**
- Sleeper's `https://api.sleeper.app/v1/players/nfl` returns a ~14MB JSON object keyed by player id. Relevant fields per record: `active` (bool), `team` (abbr or null), `position` (e.g. `"QB"`), `full_name`, `depth_chart_order` (1 = starter, null = not on depth chart). The feed contains inactive/legacy records (e.g. team `"OAK"`), which must be filtered out. Sleeper uses `WAS` for Washington natively.
- `parseId` (`utils/index.ts:63`) builds the id used by the rankings `playersMap`: `name.toLowerCase().replaceAll(' ', '_') + '_' + pos`. Its `ScrapedRanking` param requires a `rank`, so pass `rank: 0`.

- [ ] **Step 1: Make `ecr` optional in `DepthChartPlayer`**

In `types/index.ts` change:

```ts
export type DepthChartPlayer = {
  id: string;
  name: string;
  ecr?: number;
  pos: Position;
};
```

(`utils/scrape.ts` still sets `ecr` until Task 3; nothing reads it.)

- [ ] **Step 2: Write the failing tests**

Create `tests/depthCharts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildDepthCharts, SleeperPlayerRecord } from 'utils/depthCharts';

let nextId = 0;
function record(
  overrides: Partial<SleeperPlayerRecord>
): [string, SleeperPlayerRecord] {
  return [
    `${++nextId}`,
    {
      active: true,
      team: 'WAS',
      position: 'RB',
      full_name: 'Test Player',
      depth_chart_order: 1,
      ...overrides,
    },
  ];
}

function build(...records: [string, SleeperPlayerRecord][]) {
  return buildDepthCharts(Object.fromEntries(records));
}

describe('buildDepthCharts', () => {
  it('groups players by team, ordered QB→RB→WR→TE then depth order', () => {
    const charts = build(
      record({ full_name: 'RB Two', position: 'RB', depth_chart_order: 2 }),
      record({ full_name: 'QB One', position: 'QB', depth_chart_order: 1 }),
      record({ full_name: 'RB One', position: 'RB', depth_chart_order: 1 }),
      record({ full_name: 'WR One', position: 'WR', depth_chart_order: 1 }),
      record({ full_name: 'TE One', position: 'TE', depth_chart_order: 1 })
    );

    expect(charts).toHaveLength(1);
    expect(charts[0].team).toBe('WAS');
    expect(charts[0].players.map((p) => p.name)).toEqual([
      'QB One',
      'RB One',
      'RB Two',
      'WR One',
      'TE One',
    ]);
  });

  it('generates ids compatible with the rankings player map', () => {
    const charts = build(
      record({ full_name: 'Jayden Daniels', position: 'QB' })
    );

    expect(charts[0].players[0]).toEqual({
      id: 'jayden_daniels_QB',
      name: 'Jayden Daniels',
      pos: 'QB',
    });
  });

  it('skips inactive players, legacy teams, missing depth order, and non-skill positions', () => {
    const charts = build(
      record({ full_name: 'Retired Guy', active: false }),
      record({ full_name: 'Raider Ghost', team: 'OAK' }),
      record({ full_name: 'Free Agent', team: null }),
      record({ full_name: 'Practice Squad', depth_chart_order: null }),
      record({ full_name: 'A Kicker', position: 'K' }),
      record({ full_name: null }),
      record({ full_name: 'Keeper', position: 'WR' })
    );

    expect(charts).toHaveLength(1);
    expect(charts[0].players.map((p) => p.name)).toEqual(['Keeper']);
  });

  it('sorts teams alphabetically by abbreviation', () => {
    const charts = build(
      record({ team: 'WAS' }),
      record({ team: 'ARI' }),
      record({ team: 'KC' })
    );

    expect(charts.map((c) => c.team)).toEqual(['ARI', 'KC', 'WAS']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/depthCharts.test.ts`
Expected: FAIL — cannot resolve `utils/depthCharts`.

- [ ] **Step 4: Implement the transform**

Create `utils/depthCharts.ts`:

```ts
import { DepthChart, DepthChartPlayer, Position } from 'types';
import { parseId } from 'utils';

export const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
] as const;

const TEAM_SET = new Set<string>(NFL_TEAMS);

const DEPTH_CHART_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];
const POSITION_SET = new Set<string>(DEPTH_CHART_POSITIONS);

// The subset of a Sleeper players-endpoint record this module reads.
export type SleeperPlayerRecord = {
  active?: boolean | null;
  team?: string | null;
  position?: string | null;
  full_name?: string | null;
  depth_chart_order?: number | null;
};

export function buildDepthCharts(
  records: Record<string, SleeperPlayerRecord>
): DepthChart[] {
  type Entry = DepthChartPlayer & { order: number };
  const byTeam = new Map<string, Entry[]>();

  for (const record of Object.values(records)) {
    if (!record.active) continue;
    if (!record.team || !TEAM_SET.has(record.team)) continue;
    if (!record.position || !POSITION_SET.has(record.position)) continue;
    if (record.depth_chart_order == null) continue;
    if (!record.full_name) continue;

    const pos = record.position as Position;
    const entries = byTeam.get(record.team) ?? [];
    entries.push({
      id: parseId({ name: record.full_name, pos, rank: 0 }),
      name: record.full_name,
      pos,
      order: record.depth_chart_order,
    });
    byTeam.set(record.team, entries);
  }

  return Array.from(byTeam.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, entries]) => ({
      team,
      players: entries
        .sort(
          (a, b) =>
            DEPTH_CHART_POSITIONS.indexOf(a.pos) -
              DEPTH_CHART_POSITIONS.indexOf(b.pos) ||
            a.order - b.order ||
            a.name.localeCompare(b.name)
        )
        .map(({ order: _order, ...player }) => player),
    }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/depthCharts.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 7: Commit**

```bash
git add types/index.ts utils/depthCharts.ts tests/depthCharts.test.ts
git commit -m "feat(depth-charts): add Sleeper players transform"
```

---

### Task 2: Fetch layer with dev-only disk cache

**Files:**
- Modify: `utils/depthCharts.ts` (append)
- Modify: `.gitignore`

**Context for the engineer:**
- `cached()` (`utils/cache.ts`) is an in-memory TTL cache with in-flight dedupe; it resets on every dev-server restart/recompile. Because the players endpoint is ~14MB and Sleeper asks for ≤1 call/day, development additionally persists the raw payload to a gitignored `.cache/sleeper-players.json` and reuses it while its mtime is <24h old. Production (Vercel) skips the disk layer — its filesystem isn't reliably writable — and relies on `cached()` alone.
- Follow the fetch pattern from `utils/projections.ts:115-131` (`AbortSignal.timeout` needs an `as any` cast under this TS version). Use a 30s timeout — the payload is much larger than the projections responses.
- No unit tests for this task: it's IO glue (network + fs). `cached()` itself is covered by `tests/cache.test.ts`; the transform by Task 1. Verified end-to-end in Task 3.

- [ ] **Step 1: Append the fetch/cache layer to `utils/depthCharts.ts`**

Add to the imports at the top:

```ts
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { cached } from 'utils/cache';
```

Append below `buildDepthCharts`:

```ts
const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';
const DEPTH_CHARTS_TTL_MS = 24 * 60 * 60 * 1000;
// larger timeout than projections — this payload is ~14MB
const SLEEPER_TIMEOUT_MS = 30_000;
const DISK_CACHE_PATH = join(process.cwd(), '.cache', 'sleeper-players.json');

async function fetchSleeperPlayers(): Promise<
  Record<string, SleeperPlayerRecord>
> {
  // AbortSignal.timeout is supported at runtime (Node 18+) but isn't in the
  // DOM lib types bundled with this TS version.
  const response = await fetch(SLEEPER_PLAYERS_URL, {
    signal: (AbortSignal as any).timeout(SLEEPER_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Sleeper players request failed: ${response.status}`);
  }

  return response.json();
}

function readDiskCache(): Record<string, SleeperPlayerRecord> | null {
  try {
    const stats = statSync(DISK_CACHE_PATH);
    if (Date.now() - stats.mtimeMs > DEPTH_CHARTS_TTL_MS) return null;
    return JSON.parse(readFileSync(DISK_CACHE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function writeDiskCache(players: Record<string, SleeperPlayerRecord>) {
  try {
    mkdirSync(dirname(DISK_CACHE_PATH), { recursive: true });
    writeFileSync(DISK_CACHE_PATH, JSON.stringify(players));
  } catch {
    // best-effort; the disk cache is a dev convenience only
  }
}

/**
 * Sleeper asks that the players endpoint be hit at most ~once/day. The
 * in-memory cache handles that in production, but in dev it resets on
 * every restart/recompile, so development also persists the payload to a
 * gitignored disk cache reused while it's less than 24h old.
 */
async function loadSleeperPlayers(): Promise<
  Record<string, SleeperPlayerRecord>
> {
  if (process.env.NODE_ENV === 'production') {
    return fetchSleeperPlayers();
  }

  const fromDisk = readDiskCache();
  if (fromDisk) return fromDisk;

  const players = await fetchSleeperPlayers();
  writeDiskCache(players);
  return players;
}

export async function getDepthCharts(): Promise<DepthChart[]> {
  return cached('depth-charts', DEPTH_CHARTS_TTL_MS, async () =>
    buildDepthCharts(await loadSleeperPlayers())
  );
}
```

- [ ] **Step 2: Gitignore the disk cache**

In `.gitignore`, under the `# misc` section, add:

```
# dev-only sleeper disk cache
/.cache/
```

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: all suites PASS (no new tests; confirms nothing broke).

- [ ] **Step 4: Commit**

```bash
git add utils/depthCharts.ts .gitignore
git commit -m "feat(depth-charts): fetch Sleeper players with 24h + dev disk cache"
```

---

### Task 3: Swap the API route to Sleeper; delete the scrape pipeline

**Files:**
- Modify: `pages/api/depth-charts.ts` (full rewrite)
- Create: `utils/teams.ts`
- Modify: `pages/api/rankings.ts:10` (import change)
- Modify: `types/index.ts` (remove `ecr` entirely)
- Delete: `utils/scrape.ts`, `public/depth-chart.html`
- Modify: `package.json` (drop `node-html-parser` — only `utils/scrape.ts` imports it)

- [ ] **Step 1: Create `utils/teams.ts`**

Move `TEAM_TO_ABRV_MAP` out of `utils/scrape.ts` verbatim (it maps full team names → abbreviations; `pages/api/rankings.ts` uses it for Boris Chen DST names). Keep `'WSH'` for now — Task 4 renames it test-first.

```ts
export const TEAM_TO_ABRV_MAP = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'Los Angeles Chargers': 'LAC',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Los Angeles Rams': 'LAR',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WSH',
};
```

In `pages/api/rankings.ts` change line 10:

```ts
import { TEAM_TO_ABRV_MAP } from 'utils/teams';
```

- [ ] **Step 2: Rewrite `pages/api/depth-charts.ts`**

```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDepthCharts } from 'utils/depthCharts';
import { DepthChart } from 'types';

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<DepthChart[] | { error: string }>
) {
  try {
    const teams = await getDepthCharts();

    res.status(200).json(teams);
  } catch (error) {
    console.error('Failed to load depth charts', error);
    res.status(502).json({ error: 'Failed to load depth charts' });
  }
}
```

- [ ] **Step 3: Delete the scrape pipeline**

```bash
git rm utils/scrape.ts public/depth-chart.html
npm uninstall node-html-parser
```

- [ ] **Step 4: Remove `ecr` from `DepthChartPlayer`**

In `types/index.ts` (nothing sets or reads it now):

```ts
export type DepthChartPlayer = {
  id: string;
  name: string;
  pos: Position;
};
```

- [ ] **Step 5: Verify — tests, typecheck, live route**

Run: `npm test` — expected: PASS.
Run: `npx tsc --noEmit` — expected: no errors (catches dangling `utils/scrape` imports).
Run the dev server (via the browser preview tooling, not a raw shell) and load `/api/depth-charts` — expected: JSON array of 32 teams with current-season players (spot-check `WAS` includes Jayden Daniels), and `.cache/sleeper-players.json` appears. Reload — expected: instant response (cache hit, no second Sleeper fetch in the server log).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(depth-charts): serve depth charts from Sleeper, drop FantasyPros snapshot"
```

---

### Task 4: Rename WSH → WAS (test-first)

**Files:**
- Modify: `tests/projections.test.ts:77`
- Modify: `utils/projections.ts` (remove `SLEEPER_TEAM_ALIASES`)
- Modify: `utils/teams.ts` (WSH → WAS)

Player ids are name+position based, so persisted localStorage draft state is unaffected — only displayed team labels change.

- [ ] **Step 1: Update the test to expect WAS**

In `tests/projections.test.ts:77` change:

```ts
    expect(parsed?.team).toBe('WAS');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/projections.test.ts`
Expected: FAIL — received `'WSH'`.

- [ ] **Step 3: Remove the alias and rename the map entry**

In `utils/projections.ts` delete the alias map (lines 28-31):

```ts
// sleeper team abbreviations that differ from the ones this app uses
const SLEEPER_TEAM_ALIASES: Record<string, string> = {
  WAS: 'WSH',
};
```

and simplify its only use (in `parseProjection`, ~line 88):

```ts
  const team = record.team ?? undefined;
```

In `utils/teams.ts` change:

```ts
  'Washington Commanders': 'WAS',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/projections.test.ts utils/projections.ts utils/teams.ts
git commit -m "fix(teams): use WAS for Washington instead of WSH"
```

---

### Task 5: Sticky toolbar with player search

No component-test infra exists (Vitest runs in `node` env, no jsdom/RTL), so UI tasks are verified in the browser preview instead of TDD.

**Files:**
- Modify: `features/depth-charts/DepthCharts.tsx` (full rewrite below)
- Modify: `features/depth-charts/components/DepthChartTable.tsx`

**Design notes:**
- The page scrolls in an inner `Box` (`pages/depth-charts/index.tsx:32`), so `position: sticky; top: 0` sticks to that container.
- Search matches on a compressed key — `normalizePlayerName` (lowercase, strips `.'’` and suffixes) plus removing spaces/hyphens — so "amonra" matches "Amon-Ra St. Brown". Position tables and teams with zero matches are hidden.
- Hardcoded dark-only colors become mode-aware via `useColorModeValue`. The value-row highlight (`blue.900`) and its legend swatch both become `blue.100` (light) / `blue.900` (dark) so they stay in sync.

- [ ] **Step 1: Rewrite `features/depth-charts/DepthCharts.tsx`**

```tsx
import { useMemo, useState } from 'react';
import {
  Box,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useDepthCharts } from 'providers/DepthChartsProvider';
import { useDraft } from 'providers/DraftProvider';
import { normalizePlayerName } from 'utils/projections';
import { DepthChartTable } from './components/DepthChartTable';
import { DepthChart, DepthChartPlayer, Position } from 'types';

const POSITION_ORDER: Position[] = ['QB', 'RB', 'WR', 'TE'];
export const TOOLBAR_HEIGHT = '56px';

// lowercase, strip punctuation/suffixes, then drop spaces and hyphens so
// e.g. "amonra" matches "Amon-Ra St. Brown"
function toSearchKey(value: string) {
  return normalizePlayerName(value).replace(/[-\s]/g, '');
}

export function DepthCharts() {
  const {
    state: { depthCharts },
  } = useDepthCharts();
  const {
    getters: { playersMap },
  } = useDraft();

  const [searchText, setSearchText] = useState('');

  const toolbarBg = useColorModeValue('white', 'gray.800');
  const panelBg = useColorModeValue('gray.100', 'gray.700');
  const panelBorder = useColorModeValue('gray.300', 'gray.600');
  const valueBg = useColorModeValue('blue.100', 'blue.900');

  const filteredDepthCharts = useMemo(() => {
    const query = toSearchKey(searchText);
    if (!query) return depthCharts;

    return depthCharts
      .map((team) => ({
        ...team,
        players: team.players.filter((player) =>
          toSearchKey(player.name).includes(query)
        ),
      }))
      .filter((team) => team.players.length > 0);
  }, [depthCharts, searchText]);

  const getPlayersByPosition = (
    players: DepthChartPlayer[],
    position: Position
  ) => {
    return players.filter((player) => player.pos === position);
  };

  const getPlayerWithAdp = (player: DepthChartPlayer) => {
    const rankedPlayer = playersMap[player.id] ?? {};

    return {
      ...player,
      ...rankedPlayer,
    };
  };

  const renderTeamDepthChart = (team: DepthChart) => (
    <Box key={team.team} mb={4}>
      <Heading
        size="md"
        mb={4}
        p={2}
        borderRadius="md"
        bg={panelBg}
        border="1px"
        borderColor={panelBorder}
      >
        {team.team}
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {POSITION_ORDER.map((position) => {
          const positionPlayers = getPlayersByPosition(team.players, position);
          if (positionPlayers.length === 0) return null;

          const rankedPlayers = positionPlayers.map(getPlayerWithAdp);

          return (
            <VStack key={position} align="stretch" spacing={2}>
              <DepthChartTable position={position} players={rankedPlayers} />
            </VStack>
          );
        })}
      </SimpleGrid>
    </Box>
  );

  return (
    <Box>
      <HStack
        position="sticky"
        top={0}
        zIndex={20}
        height={TOOLBAR_HEIGHT}
        bg={toolbarBg}
        spacing={4}
        justifyContent="space-between"
      >
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search players..."
          maxWidth="300px"
          size="sm"
          borderRadius="md"
        />
        <HStack spacing={3} flexShrink={0}>
          <Box w={4} h={4} bg={valueBg} borderRadius="sm" />
          <Text fontSize="sm" fontWeight="bold" color="gray.500">
            Value Pick
          </Text>
        </HStack>
      </HStack>

      {filteredDepthCharts.length === 0 ? (
        <Text mt={8} textAlign="center" color="gray.500">
          No players match &quot;{searchText}&quot;
        </Text>
      ) : (
        filteredDepthCharts.map(renderTeamDepthChart)
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Make the value-row highlight mode-aware in `DepthChartTable.tsx`**

Add `useColorModeValue` to the Chakra import, then inside the component:

```tsx
export function DepthChartTable(props: DepthChartTableProps) {
  const valueBg = useColorModeValue('blue.100', 'blue.900');

  return (
```

and change the row:

```tsx
            <Tr
              key={player.id}
              bg={playerIsValue(player) ? valueBg : undefined}
            >
```

- [ ] **Step 3: Verify in the browser preview**

Start the dev server via the preview tooling and open `/depth-charts`:
- Toolbar (search + legend) sticks to the top while scrolling.
- Typing "daniels" hides non-matching teams/positions; WAS shows Jayden Daniels; clearing restores all 32 teams.
- Typing "amonra" finds Amon-Ra St. Brown (DET).
- Nonsense query shows the "No players match" message.
- Toggle dark/light mode: toolbar, headers, and value rows are legible in both.

- [ ] **Step 4: Commit**

```bash
git add features/depth-charts
git commit -m "feat(depth-charts): sticky toolbar with player search"
```

---

### Task 6: Sticky team headers

**Files:**
- Modify: `features/depth-charts/DepthCharts.tsx`

- [ ] **Step 1: Make each team `Heading` sticky below the toolbar**

In `renderTeamDepthChart`, change the `Heading` props (adds `position`, `top`, `zIndex`; `bg` must stay opaque so content scrolls under it — `panelBg` already is):

```tsx
      <Heading
        size="md"
        mb={4}
        p={2}
        borderRadius="md"
        bg={panelBg}
        border="1px"
        borderColor={panelBorder}
        position="sticky"
        top={TOOLBAR_HEIGHT}
        zIndex={10}
      >
        {team.team}
      </Heading>
```

- [ ] **Step 2: Verify in the browser preview**

Scroll through several teams: the current team's header pins just below the toolbar and is pushed off by the next team's header. Check both color modes.

- [ ] **Step 3: Commit**

```bash
git add features/depth-charts/DepthCharts.tsx
git commit -m "feat(depth-charts): sticky team headers"
```

---

### Task 7: Side index rail with scroll-spy

**Files:**
- Create: `features/depth-charts/components/TeamIndexRail.tsx`
- Modify: `features/depth-charts/DepthCharts.tsx`

**Design notes:**
- The rail is `position: fixed` on the right edge, vertically centered, hidden below `md` (32 rows ≈ 520px of height; on mobile, search covers team-finding).
- Scroll-spy: the page's scroll container is the inner `Box`, and scroll events don't bubble — but they do fire on `window` with `capture: true`. The active team is the last section whose top edge sits above a fixed threshold (AppBar 64px + toolbar 56px + a small margin).
- Clicking scrolls via `scrollIntoView`; each team section gets `scrollMarginTop` equal to the toolbar height so headers land below the sticky toolbar.

- [ ] **Step 1: Create `features/depth-charts/components/TeamIndexRail.tsx`**

```tsx
import { Box, VStack, useColorModeValue } from '@chakra-ui/react';

export type TeamIndexRailProps = {
  teams: string[];
  activeTeam: string | null;
  onSelect: (team: string) => void;
};

export function TeamIndexRail(props: TeamIndexRailProps) {
  const activeColor = useColorModeValue('blue.600', 'blue.300');
  const inactiveColor = 'gray.500';

  return (
    <VStack
      as="nav"
      aria-label="Jump to team"
      position="fixed"
      right={1}
      top="50%"
      transform="translateY(-50%)"
      spacing={0}
      zIndex={30}
      display={{ base: 'none', md: 'flex' }}
    >
      {props.teams.map((team) => {
        const isActive = team === props.activeTeam;

        return (
          <Box
            as="button"
            key={team}
            onClick={() => props.onSelect(team)}
            fontSize="10px"
            lineHeight="1.6"
            px={1}
            fontWeight={isActive ? 'bold' : 'normal'}
            color={isActive ? activeColor : inactiveColor}
            _hover={{ color: activeColor }}
          >
            {team}
          </Box>
        );
      })}
    </VStack>
  );
}

export default TeamIndexRail;
```

- [ ] **Step 2: Wire the rail and scroll-spy into `DepthCharts.tsx`**

Add imports:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { TeamIndexRail } from './components/TeamIndexRail';
```

Add below the `TOOLBAR_HEIGHT` constant:

```tsx
// AppBar (64px) + sticky toolbar (56px) + margin: a section whose top is
// above this line is the one the user is currently reading
const ACTIVE_TEAM_THRESHOLD_PX = 140;
```

Add inside the component, after `filteredDepthCharts`:

```tsx
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  useEffect(() => {
    const updateActiveTeam = () => {
      let current: string | null = null;

      for (const chart of filteredDepthCharts) {
        const section = document.getElementById(`team-${chart.team}`);
        if (!section) continue;

        if (
          section.getBoundingClientRect().top <= ACTIVE_TEAM_THRESHOLD_PX
        ) {
          current = chart.team;
        } else {
          break;
        }
      }

      setActiveTeam(current ?? filteredDepthCharts[0]?.team ?? null);
    };

    updateActiveTeam();
    // the page scrolls in an inner Box; scroll events don't bubble but are
    // observable on window in the capture phase
    window.addEventListener('scroll', updateActiveTeam, true);
    return () => window.removeEventListener('scroll', updateActiveTeam, true);
  }, [filteredDepthCharts]);

  const scrollToTeam = (team: string) => {
    document
      .getElementById(`team-${team}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
```

In `renderTeamDepthChart`, give each section its anchor id and scroll offset:

```tsx
    <Box
      key={team.team}
      id={`team-${team.team}`}
      mb={4}
      sx={{ scrollMarginTop: TOOLBAR_HEIGHT }}
    >
```

Render the rail just before the closing `</Box>` of the component's return:

```tsx
      <TeamIndexRail
        teams={filteredDepthCharts.map((chart) => chart.team)}
        activeTeam={activeTeam}
        onSelect={scrollToTeam}
      />
```

- [ ] **Step 3: Verify in the browser preview**

- Rail shows all 32 abbreviations on the right at desktop width; hidden at mobile width (`resize_window` to mobile preset).
- Clicking `WAS` smooth-scrolls to Washington with its header visible below the toolbar; clicking `ARI` returns to the top.
- Scrolling manually moves the bold/colored highlight through the rail.
- With a search active, the rail only lists matching teams.

- [ ] **Step 4: Commit**

```bash
git add features/depth-charts
git commit -m "feat(depth-charts): team index rail with scroll-spy"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full checks**

Run: `npm test` — expected: all suites PASS.
Run: `npm run lint` — expected: no errors.
Run: `npm run build` — expected: builds cleanly (also typechecks).

- [ ] **Step 2: End-to-end browser pass**

On `/depth-charts` in the preview: current 2026 rosters (spot-check a few recent player moves), WAS label (not WSH), search + sticky toolbar + sticky headers + rail all working together, both color modes, mobile and desktop widths. Also spot-check `/` (draft board) still loads and Washington DST shows team `WAS`.

- [ ] **Step 3: Commit any stragglers**

```bash
git status
```

Expected: clean tree (everything committed in prior tasks).
