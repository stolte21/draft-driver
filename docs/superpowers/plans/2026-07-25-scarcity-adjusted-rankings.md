# Scarcity-Adjusted Rankings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-order the draft board by value over replacement (VORP) computed from Sleeper projections, the roster configuration, and league size, behind an opt-in settings toggle — with tiers recomputed from the value distribution.

**Architecture:** The server fetches Sleeper season projections (cached in-memory for 24h) and attaches `projectedPoints` to each player in `/api/rankings`. A pure client-side value engine (`utils/vorp.ts`) computes replacement levels from `rosterSize × numTeams` (with data-driven FLX allocation), sorts by value, recomputes tiers via value-gap clustering, and recomputes positional ranks. The DraftBoard applies it in a `useMemo` when the toggle is on — no refetch on settings changes.

**Tech Stack:** Next.js 12 (pages router), TypeScript 4.7, Chakra UI, react-query. New dev dependency: vitest (first test runner in this repo).

**Spec:** `docs/superpowers/specs/2026-07-25-scarcity-adjusted-rankings-design.md`

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `vitest.config.ts` | Create | Test runner config with `utils`/`types` aliases |
| `package.json` | Modify | Add `test` script + vitest devDependency |
| `utils/cache.ts` | Create | Generic in-memory TTL cache with in-flight dedupe |
| `utils/projections.ts` | Create | Sleeper fetch, name normalization, `attachProjections` |
| `types/index.ts` | Modify | `Player.projectedPoints`, `ProjectedPlayer` type |
| `pages/api/rankings.ts` | Modify | Fetch projections in parallel, attach non-fatally |
| `utils/vorp.ts` | Create | Replacement levels, value sort, value-gap tiers, pRank |
| `providers/SettingsProvider.tsx` | Modify | `useScarcityAdjustment` state + toggle action |
| `components/Settings/SettingsScarcitySwitch.tsx` | Create | Toggle UI |
| `components/Settings/Settings.tsx` | Modify | Mount the switch |
| `components/DraftBoard/index.tsx` | Modify | Apply adjustment in `useMemo` |
| `components/DraftBoard/DraftBoardRankingRow.tsx` | Modify | Show dimmed original rank in scarcity mode |
| `tests/cache.test.ts` | Create | Cache TTL + dedupe tests |
| `tests/projections.test.ts` | Create | Normalization, parsing, attach tests |
| `tests/vorp.test.ts` | Create | Replacement levels, sorting, tiers tests |

Verified live facts baked into this plan (checked 2026-07-25):

- `https://api.sleeper.com/projections/nfl/2026?season_type=regular&position[]=QB&order_by=pts_half_ppr` returns full-depth JSON without auth (QB: 355, RB: 741, WR: 1362, TE: 646, K: 157, DEF: 32 records). Each record: `{ stats: { pts_std, pts_ppr, pts_half_ppr, ... }, player: { first_name, last_name, position }, team }`.
- Sleeper defenses have `position: "DEF"`; the app uses `DST` with team abbreviations from `TEAM_TO_ABRV_MAP` (`WSH` for Washington — Sleeper uses `WAS`).
- FantasyPros projections pages are login-gated (10 rows max) — do NOT use them.

---

### Task 1: Vitest infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts` (deleted again in Task 2)

- [ ] **Step 1: Install vitest**

Run: `npm install --save-dev vitest`
Expected: adds `vitest` to `devDependencies` in `package.json`.

- [ ] **Step 2: Add test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`. The repo imports via `baseUrl: "."` (e.g., `import { cached } from 'utils/cache'`), so alias the two module roots tests will touch:

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      utils: resolve(__dirname, 'utils'),
      types: resolve(__dirname, 'types'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create a smoke test against existing code**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseId } from 'utils';

describe('vitest setup', () => {
  it('resolves baseUrl imports', () => {
    expect(parseId({ rank: 1, name: 'Josh Allen', pos: 'QB' })).toBe(
      'josh_allen_QB'
    );
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: 1 passed. If the `utils` import fails to resolve, fix the alias in `vitest.config.ts` before proceeding.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/smoke.test.ts
git commit -m "test: add vitest infrastructure"
```

---

### Task 2: Server-side TTL cache

**Files:**
- Create: `utils/cache.ts`
- Test: `tests/cache.test.ts`
- Delete: `tests/smoke.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/cache.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cached, clearCache } from 'utils/cache';

describe('cached', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches on first call and returns the value', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value within the TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    await cached('key', 1000, fetcher);
    vi.advanceTimersByTime(999);
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('new');
    await cached('key', 1000, fetcher);
    vi.advanceTimersByTime(1001);
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('new');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent calls into one fetch', async () => {
    let resolveFetch: (value: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const first = cached('key', 1000, fetcher);
    const second = cached('key', 1000, fetcher);
    resolveFetch!('data');

    expect(await first).toBe('data');
    expect(await second).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(cached('key', 1000, fetcher)).rejects.toThrow('boom');
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('recovered');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keys entries independently', async () => {
    const fetcherA = vi.fn().mockResolvedValue('a');
    const fetcherB = vi.fn().mockResolvedValue('b');
    expect(await cached('a', 1000, fetcherA)).toBe('a');
    expect(await cached('b', 1000, fetcherB)).toBe('b');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `utils/cache`.

- [ ] **Step 3: Implement the cache**

Create `utils/cache.ts`:

```ts
type CacheEntry = { value: unknown; fetchedAt: number };

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * In-memory TTL cache with in-flight dedupe. Entries live for the
 * lifetime of the server process; failures are not cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = store.get(key);
  if (entry && Date.now() - entry.fetchedAt < ttlMs) {
    return entry.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      store.set(key, { value, fetchedAt: Date.now() });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function clearCache() {
  store.clear();
  inFlight.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all cache tests PASS.

- [ ] **Step 5: Delete the smoke test**

Run: `rm tests/smoke.test.ts` (its job — proving the harness works — is done; the cache tests now cover that).

- [ ] **Step 6: Commit**

```bash
git add utils/cache.ts tests/cache.test.ts tests/smoke.test.ts
git commit -m "feat: add in-memory TTL cache with in-flight dedupe"
```

---

### Task 3: Projections fetcher (Sleeper API)

**Files:**
- Modify: `types/index.ts`
- Create: `utils/projections.ts`
- Test: `tests/projections.test.ts`

- [ ] **Step 1: Add types**

In `types/index.ts`, add `projectedPoints` to `Player` (after `vsAdp?: number;`):

```ts
export type Player = {
  id: string;
  rank: number;
  pRank: number;
  adp: number;
  name: string;
  position: Position;
  isRookie: boolean;
  team?: string;
  tier?: number;
  vsAdp?: number;
  projectedPoints?: number;
};
```

And add at the end of the file:

```ts
export type ProjectedPlayer = {
  name: string;
  normalizedName: string;
  pos: Position;
  team?: string;
  points: Record<Format, number>;
};
```

- [ ] **Step 2: Write the failing tests**

Create `tests/projections.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  normalizePlayerName,
  parseProjection,
  attachProjections,
} from 'utils/projections';
import { Player, ProjectedPlayer } from 'types';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: 'x',
  rank: 1,
  pRank: 1,
  adp: 1,
  name: 'X',
  position: 'QB',
  isRookie: false,
  ...overrides,
});

const makeProjection = (
  overrides: Partial<ProjectedPlayer>
): ProjectedPlayer => ({
  name: 'X',
  normalizedName: 'x',
  pos: 'QB',
  points: { standard: 100, ppr: 110, 'half-ppr': 105 },
  ...overrides,
});

describe('normalizePlayerName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizePlayerName("Ja'Marr Chase")).toBe('jamarr chase');
    expect(normalizePlayerName('A.J. Brown')).toBe('aj brown');
  });

  it('strips generational suffixes', () => {
    expect(normalizePlayerName('Marvin Harrison Jr.')).toBe('marvin harrison');
    expect(normalizePlayerName('Patrick Mahomes II')).toBe('patrick mahomes');
    expect(normalizePlayerName('Will Fuller V')).toBe('will fuller');
  });

  it('leaves ordinary names alone', () => {
    expect(normalizePlayerName('Josh Allen')).toBe('josh allen');
  });
});

describe('parseProjection', () => {
  const record = {
    stats: { pts_std: 300.1, pts_ppr: 310.5, pts_half_ppr: 305.3 },
    player: { first_name: 'Josh', last_name: 'Allen', position: 'QB' },
    team: 'BUF',
  };

  it('maps a sleeper record to a ProjectedPlayer', () => {
    expect(parseProjection(record)).toEqual({
      name: 'Josh Allen',
      normalizedName: 'josh allen',
      pos: 'QB',
      team: 'BUF',
      points: { standard: 300.1, ppr: 310.5, 'half-ppr': 305.3 },
    });
  });

  it('maps DEF position to DST and aliases the team abbreviation', () => {
    const def = {
      stats: { pts_std: 120, pts_ppr: 120, pts_half_ppr: 120 },
      player: { first_name: 'Washington', last_name: 'Commanders', position: 'DEF' },
      team: 'WAS',
    };
    const parsed = parseProjection(def);
    expect(parsed?.pos).toBe('DST');
    expect(parsed?.team).toBe('WSH');
  });

  it('returns null for records without stats or player', () => {
    expect(parseProjection({ stats: null, player: record.player, team: 'BUF' })).toBeNull();
    expect(parseProjection({ stats: record.stats, player: null, team: 'BUF' })).toBeNull();
  });

  it('returns null when every format is missing points', () => {
    expect(
      parseProjection({
        stats: { pts_std: null, pts_ppr: null, pts_half_ppr: null },
        player: record.player,
        team: 'BUF',
      })
    ).toBeNull();
  });
});

describe('attachProjections', () => {
  it('attaches points for the requested format by normalized name + position', () => {
    const players = [makePlayer({ name: 'Marvin Harrison Jr.', position: 'WR' })];
    const projections = [
      makeProjection({
        name: 'Marvin Harrison',
        normalizedName: 'marvin harrison',
        pos: 'WR',
        points: { standard: 200, ppr: 250, 'half-ppr': 225 },
      }),
    ];

    attachProjections(players, projections, 'half-ppr');
    expect(players[0].projectedPoints).toBe(225);
  });

  it('does not match the same name at a different position', () => {
    const players = [makePlayer({ name: 'Taysom Hill', position: 'TE' })];
    const projections = [
      makeProjection({ name: 'Taysom Hill', normalizedName: 'taysom hill', pos: 'QB' }),
    ];

    attachProjections(players, projections, 'ppr');
    expect(players[0].projectedPoints).toBeUndefined();
  });

  it('matches DSTs by team abbreviation, not name', () => {
    const players = [
      makePlayer({ name: 'Baltimore Ravens', position: 'DST', team: 'BAL' }),
    ];
    const projections = [
      makeProjection({
        name: 'Baltimore',
        normalizedName: 'baltimore',
        pos: 'DST',
        team: 'BAL',
        points: { standard: 130, ppr: 130, 'half-ppr': 130 },
      }),
    ];

    attachProjections(players, projections, 'standard');
    expect(players[0].projectedPoints).toBe(130);
  });

  it('leaves unmatched players untouched', () => {
    const players = [makePlayer({ name: 'Unknown Guy', position: 'RB' })];
    attachProjections(players, [], 'ppr');
    expect(players[0].projectedPoints).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `utils/projections`.

- [ ] **Step 4: Implement the fetcher**

Create `utils/projections.ts`:

```ts
import { Format, Player, Position, ProjectedPlayer } from 'types';
import { cached } from 'utils/cache';

const SLEEPER_BASE_URL = 'https://api.sleeper.com/projections/nfl';
const SLEEPER_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const PROJECTIONS_TTL_MS = 24 * 60 * 60 * 1000;

// sleeper team abbreviations that differ from the ones this app uses
const SLEEPER_TEAM_ALIASES: Record<string, string> = {
  WAS: 'WSH',
};

export type SleeperProjection = {
  stats: {
    pts_std?: number | null;
    pts_ppr?: number | null;
    pts_half_ppr?: number | null;
  } | null;
  player: {
    first_name: string;
    last_name: string;
    position: string;
  } | null;
  team: string | null;
};

export function normalizePlayerName(name: string) {
  return name
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .trim()
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/, '');
}

export function parseProjection(
  record: SleeperProjection
): ProjectedPlayer | null {
  if (!record.player || !record.stats) return null;

  const { pts_std, pts_ppr, pts_half_ppr } = record.stats;
  if (pts_std == null && pts_ppr == null && pts_half_ppr == null) return null;

  const name = `${record.player.first_name} ${record.player.last_name}`;
  const pos =
    record.player.position === 'DEF'
      ? 'DST'
      : (record.player.position as Position);
  const team = record.team
    ? SLEEPER_TEAM_ALIASES[record.team] ?? record.team
    : undefined;

  return {
    name,
    normalizedName: normalizePlayerName(name),
    pos,
    team,
    points: {
      standard: pts_std ?? 0,
      ppr: pts_ppr ?? 0,
      'half-ppr': pts_half_ppr ?? 0,
    },
  };
}

async function fetchPositionProjections(
  year: number,
  position: string
): Promise<SleeperProjection[]> {
  const url = `${SLEEPER_BASE_URL}/${year}?season_type=regular&position%5B%5D=${position}&order_by=pts_half_ppr`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Sleeper projections request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchProjections(): Promise<ProjectedPlayer[]> {
  return cached('projections', PROJECTIONS_TTL_MS, async () => {
    const year = new Date().getFullYear();
    const results = await Promise.all(
      SLEEPER_POSITIONS.map((pos) => fetchPositionProjections(year, pos))
    );

    return results
      .flat()
      .map(parseProjection)
      .filter((proj): proj is ProjectedPlayer => proj !== null);
  });
}

/**
 * Causes a side effect of setting projectedPoints on matching players.
 * Skill players match by normalized name + position; DSTs match by team.
 */
export function attachProjections(
  players: Player[],
  projections: ProjectedPlayer[],
  format: Format
) {
  const byNameAndPos = new Map<string, ProjectedPlayer>();
  const dstByTeam = new Map<string, ProjectedPlayer>();

  projections.forEach((proj) => {
    if (proj.pos === 'DST') {
      if (proj.team) dstByTeam.set(proj.team, proj);
    } else {
      byNameAndPos.set(`${proj.normalizedName}|${proj.pos}`, proj);
    }
  });

  players.forEach((player) => {
    const proj =
      player.position === 'DST'
        ? player.team
          ? dstByTeam.get(player.team)
          : undefined
        : byNameAndPos.get(
            `${normalizePlayerName(player.name)}|${player.position}`
          );

    if (proj) {
      player.projectedPoints = proj.points[format];
    }
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all projections tests PASS (cache tests still green).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts utils/projections.ts tests/projections.test.ts
git commit -m "feat: add sleeper projections fetcher with name matching"
```

---

### Task 4: Attach projections in the rankings API

**Files:**
- Modify: `pages/api/rankings.ts`

- [ ] **Step 1: Wire projections into the handler**

In `pages/api/rankings.ts`:

Add to the imports:

```ts
import { fetchProjections, attachProjections } from 'utils/projections';
import { ProjectedPlayer } from 'types';
```

(extend the existing `types` import line rather than adding a duplicate import).

Replace the two sequential fetches at the top of the `try` block:

```ts
    const fpAdp = await fetchFantasyProsDataAdp(format);
    const fpRookies = new Set(
      (await fetchFantasyProsRookies()).map((rookie) => rookie.name)
    );
```

with a parallel fetch that treats projections as optional:

```ts
    const [fpAdp, fpRookiesList, projections] = await Promise.all([
      fetchFantasyProsDataAdp(format),
      fetchFantasyProsRookies(),
      // projections are an enhancement — rankings must still work without them
      fetchProjections().catch((error): ProjectedPlayer[] => {
        console.error('Failed to fetch projections:', error);
        return [];
      }),
    ]);
    const fpRookies = new Set(fpRookiesList.map((rookie) => rookie.name));
```

Then, after the `rankingsToUse.forEach(...)` loop that builds `players` (immediately before the closing `} catch (error) {`), add:

```ts
    attachProjections(players, projections, format);
```

- [ ] **Step 2: Verify against the live API**

Start the dev server (`npm run dev` in the background or via the preview tooling), then:

Run: `curl -s "http://localhost:3000/api/rankings?format=ppr&src=boris" | python3 -c "import json,sys; d=json.load(sys.stdin); matched=[p for p in d if 'projectedPoints' in p]; print(len(matched), '/', len(d), 'players have projections'); qbs=[p for p in matched if p['position']=='QB']; print('sample QB:', qbs[0]['name'], qbs[0]['projectedPoints'])"`

Expected: a large majority of players have `projectedPoints` (> 80% of the board; kickers/deep bench players may miss), and the sample QB has a plausible season total (250–400).

Also verify the second request is served from cache: the server logs should show no repeated Sleeper fetch burst, and response time should drop.

- [ ] **Step 3: Run lint and tests**

Run: `npm run lint && npm test`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add pages/api/rankings.ts
git commit -m "feat: attach cached sleeper projections to rankings API"
```

---

### Task 5: Replacement levels

**Files:**
- Create: `utils/vorp.ts`
- Test: `tests/vorp.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/vorp.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeReplacementLevels } from 'utils/vorp';
import { Player, Position } from 'types';

let nextId = 0;
const makePlayer = (
  position: Position,
  projectedPoints: number | undefined,
  rank?: number
): Player => ({
  id: `p${nextId++}`,
  rank: rank ?? nextId,
  pRank: 0,
  adp: 0,
  name: `Player ${nextId}`,
  position,
  isRookie: false,
  projectedPoints,
});

/** n players at a position with points descending from `top` in steps of `step` */
const position = (pos: Position, n: number, top: number, step: number) =>
  Array.from({ length: n }, (_, i) => makePlayer(pos, top - i * step));

const baseRoster: Record<Position, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLX: 0,
  K: 1,
  DST: 1,
  BN: 0,
};

describe('computeReplacementLevels', () => {
  it('sets replacement to the last starter per position', () => {
    const players = [
      ...position('QB', 30, 400, 10), // QB1=400, QB2=390, ...
      ...position('RB', 60, 300, 5),
      ...position('WR', 60, 280, 4),
      ...position('TE', 30, 200, 6),
      ...position('K', 30, 150, 2),
      ...position('DST', 30, 140, 2),
    ];

    const levels = computeReplacementLevels(players, baseRoster, 10);

    // 1 QB × 10 teams → replacement is the 10th QB: 400 - 9×10 = 310
    expect(levels.QB).toBe(310);
    // 2 RB × 10 teams → 20th RB: 300 - 19×5 = 205
    expect(levels.RB).toBe(205);
  });

  it('moves the QB replacement level down in a 2QB league', () => {
    const players = [
      ...position('QB', 40, 400, 10),
      ...position('RB', 60, 300, 5),
      ...position('WR', 60, 280, 4),
      ...position('TE', 30, 200, 6),
      ...position('K', 30, 150, 2),
      ...position('DST', 30, 140, 2),
    ];

    const oneQb = computeReplacementLevels(players, baseRoster, 12);
    const twoQb = computeReplacementLevels(
      players,
      { ...baseRoster, QB: 2 },
      12
    );

    // 12th QB vs 24th QB
    expect(oneQb.QB).toBe(400 - 11 * 10);
    expect(twoQb.QB).toBe(400 - 23 * 10);
    expect(twoQb.QB).toBeLessThan(oneQb.QB!);
  });

  it('allocates flex slots to the position with the best next player', () => {
    const players = [
      ...position('RB', 10, 100, 10), // after 2 starters ea × 1 team: next RB = 80
      ...position('WR', 10, 95, 1), //  next WR = 93
      ...position('TE', 10, 50, 1),
    ];
    const roster: Record<Position, number> = {
      QB: 0,
      RB: 2,
      WR: 2,
      TE: 0,
      FLX: 1,
      K: 0,
      DST: 0,
      BN: 0,
    };

    // 1 team, 1 flex slot: WR3 (93) beats RB3 (80), so WR consumes the slot
    const levels = computeReplacementLevels(players, roster, 1);
    expect(levels.WR).toBe(93); // 3 WR starters → last is WR3
    expect(levels.RB).toBe(90); // still 2 RB starters → last is RB2
  });

  it('uses the best player as replacement for zero-slot positions', () => {
    const players = [
      ...position('QB', 10, 400, 10),
      ...position('K', 10, 150, 2),
    ];
    const roster: Record<Position, number> = {
      QB: 1,
      RB: 0,
      WR: 0,
      TE: 0,
      FLX: 0,
      K: 0,
      DST: 0,
      BN: 0,
    };

    const levels = computeReplacementLevels(players, roster, 10);
    expect(levels.K).toBe(150); // best kicker → every kicker has value ≤ 0
  });

  it('clamps to the deepest available player when the pool is shallow', () => {
    const players = [...position('DST', 5, 140, 2)];
    const roster: Record<Position, number> = {
      QB: 0,
      RB: 0,
      WR: 0,
      TE: 0,
      FLX: 0,
      K: 0,
      DST: 1,
      BN: 0,
    };

    // 14 teams want 14 DSTs but only 5 exist → replacement is the 5th
    const levels = computeReplacementLevels(players, roster, 14);
    expect(levels.DST).toBe(140 - 4 * 2);
  });

  it('ignores players without projections', () => {
    const players = [
      makePlayer('QB', 400),
      makePlayer('QB', undefined),
      makePlayer('QB', 300),
    ];
    const roster: Record<Position, number> = {
      QB: 2,
      RB: 0,
      WR: 0,
      TE: 0,
      FLX: 0,
      K: 0,
      DST: 0,
      BN: 0,
    };

    const levels = computeReplacementLevels(players, roster, 1);
    expect(levels.QB).toBe(300); // 2nd projected QB, unprojected one skipped
  });

  it('omits positions with no projected players', () => {
    const players = [...position('QB', 5, 400, 10)];
    const levels = computeReplacementLevels(players, baseRoster, 10);
    expect(levels.RB).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `utils/vorp`.

- [ ] **Step 3: Implement**

Create `utils/vorp.ts`:

```ts
import { Player, Position } from 'types';
import { flexPositionsList, positionsList } from 'utils';

export type ReplacementLevels = Partial<Record<Position, number>>;

/**
 * Replacement level per position: the projected points of the last starter,
 * where starters = rosterSize × numTeams and each FLX slot is handed to
 * whichever flex-eligible position has the highest-projected next player.
 * Bench slots are intentionally ignored (v1 simplification, see spec).
 */
export function computeReplacementLevels(
  players: Player[],
  rosterSize: Record<Position, number>,
  numTeams: number
): ReplacementLevels {
  const pointsByPosition: Partial<Record<Position, number[]>> = {};
  positionsList.forEach((pos) => {
    pointsByPosition[pos] = players
      .filter((p) => p.position === pos && p.projectedPoints !== undefined)
      .map((p) => p.projectedPoints!)
      .sort((a, b) => b - a);
  });

  const starters: Partial<Record<Position, number>> = {};
  positionsList.forEach((pos) => {
    starters[pos] = rosterSize[pos] * numTeams;
  });

  const flexSlots = rosterSize.FLX * numTeams;
  for (let slot = 0; slot < flexSlots; slot++) {
    let bestPos: Position | null = null;
    let bestPoints = -Infinity;

    flexPositionsList.forEach((pos) => {
      const next = pointsByPosition[pos]?.[starters[pos]!];
      if (next !== undefined && next > bestPoints) {
        bestPoints = next;
        bestPos = pos;
      }
    });

    if (bestPos === null) break;
    starters[bestPos]! += 1;
  }

  const levels: ReplacementLevels = {};
  positionsList.forEach((pos) => {
    const pool = pointsByPosition[pos]!;
    if (pool.length === 0) return;

    const lastStarterIndex = Math.max(starters[pos]! - 1, 0);
    levels[pos] = pool[Math.min(lastStarterIndex, pool.length - 1)];
  });

  return levels;
}
```

Note: `positionsList` is `['QB', 'RB', 'WR', 'TE', 'K', 'DST']` and `flexPositionsList` is `['WR', 'RB', 'TE']`, both already exported from `utils/index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/vorp.ts tests/vorp.test.ts
git commit -m "feat: compute roster-aware replacement levels"
```

---

### Task 6: Value sorting, value-gap tiers, and positional ranks

**Files:**
- Modify: `utils/vorp.ts`
- Test: `tests/vorp.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/vorp.test.ts` (add `computeValueTiers, applyScarcityAdjustment` to the existing `utils/vorp` import):

```ts
describe('computeValueTiers', () => {
  it('returns an empty array for no values', () => {
    expect(computeValueTiers([])).toEqual([]);
  });

  it('starts a new tier at large value gaps', () => {
    // gaps: 1,1,20,1 — with many small gaps the 20 clearly exceeds threshold
    const values = [100, 99, 98, 78, 77];
    const tiers = computeValueTiers(values);
    expect(tiers).toEqual([1, 1, 1, 2, 2]);
  });

  it('keeps one tier for a perfectly smooth distribution', () => {
    const values = Array.from({ length: 50 }, (_, i) => 100 - i);
    expect(new Set(computeValueTiers(values)).size).toBe(1);
  });

  it('is non-decreasing (tiers are contiguous)', () => {
    const values = [200, 150, 149, 100, 99, 98, 40];
    const tiers = computeValueTiers(values);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
    }
  });

  it('produces a sane tier count on a realistic distribution', () => {
    // ~200 players: steep elite top flattening into a long tail, with
    // occasional cliffs — the shape of a real VORP distribution
    // (Amended during execution: the original Math.round(-i/60, +15) generator
    // compressed gaps below the tier threshold and produced only 3 tiers.)
    const values = Array.from({ length: 200 }, (_, i) =>
      250 * Math.exp(-i / 40) + (i % 25 === 0 ? 20 : 0)
    ).sort((a, b) => b - a);

    const tierCount = new Set(computeValueTiers(values)).size;
    expect(tierCount).toBeGreaterThanOrEqual(4);
    expect(tierCount).toBeLessThanOrEqual(30);
  });
});

describe('applyScarcityAdjustment', () => {
  const roster: Record<Position, number> = {
    QB: 2,
    RB: 2,
    WR: 2,
    TE: 1,
    FLX: 0,
    K: 0,
    DST: 0,
    BN: 0,
  };

  it('re-orders by value over replacement, not raw points', () => {
    const players = [
      // QBs score more raw points but RB replacement is much lower here
      ...position('QB', 6, 320, 2), // flat position: little value spread
      ...position('RB', 6, 300, 40), // steep position: huge value spread
      ...position('WR', 6, 200, 10),
      ...position('TE', 6, 150, 10),
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 2);

    // RB1 value = 300 - (300-3×40) = 120; QB1 value = 320 - (320-3×2) = 6
    expect(adjusted[0].position).toBe('RB');
  });

  it('lifts QBs when roster demands two of them', () => {
    const players = [
      ...position('QB', 30, 400, 12), // steep QB decay
      ...position('RB', 50, 310, 5),
      ...position('WR', 50, 300, 4),
      ...position('TE', 20, 180, 8),
    ];
    const oneQbRoster = { ...roster, QB: 1 };

    const oneQb = applyScarcityAdjustment(players, oneQbRoster, 12);
    const twoQb = applyScarcityAdjustment(players, roster, 12);

    const qbsInTop24 = (list: Player[]) =>
      list.slice(0, 24).filter((p) => p.position === 'QB').length;

    expect(qbsInTop24(twoQb)).toBeGreaterThan(qbsInTop24(oneQb));
  });

  it('sends players without projections to the bottom in rank order', () => {
    const players = [
      makePlayer('QB', 300, 5),
      makePlayer('RB', undefined, 2),
      makePlayer('WR', undefined, 1),
      makePlayer('RB', 200, 4),
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 1);
    const tailNames = adjusted.slice(-2).map((p) => p.rank);
    expect(tailNames).toEqual([1, 2]); // unprojected players last, by rank
  });

  it('recomputes contiguous positional ranks in the new order', () => {
    const players = [
      makePlayer('QB', 250, 1), // source rank says this QB is first...
      makePlayer('QB', 300, 2), // ...but projections disagree
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 1);
    expect(adjusted[0].projectedPoints).toBe(300);
    expect(adjusted[0].pRank).toBe(1);
    expect(adjusted[1].pRank).toBe(2);
  });

  it('does not mutate the input players', () => {
    const players = [makePlayer('QB', 300, 1), makePlayer('QB', 250, 2)];
    const before = JSON.parse(JSON.stringify(players));
    applyScarcityAdjustment(players, roster, 1);
    expect(players).toEqual(before);
  });

  it('breaks value ties by original rank', () => {
    const players = [
      makePlayer('WR', 200, 9),
      makePlayer('WR', 200, 3),
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 1);
    expect(adjusted[0].rank).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `computeValueTiers` / `applyScarcityAdjustment` not exported.

- [ ] **Step 3: Implement**

Append to `utils/vorp.ts`:

```ts
const TIER_GAP_MULTIPLIER = 3;
const MIN_TIER_GAP_POINTS = 4;
const TIER_SAMPLE_SIZE = 200;

/**
 * Assign 1-based tiers to a descending list of values. A new tier starts
 * wherever the drop to the next value exceeds a threshold derived from the
 * distribution (multiple of the median consecutive gap in the sample window),
 * floored so micro-gaps never fragment tiers.
 */
export function computeValueTiers(sortedValuesDesc: number[]): number[] {
  if (sortedValuesDesc.length === 0) return [];

  const sampleEnd = Math.min(sortedValuesDesc.length, TIER_SAMPLE_SIZE);
  const gaps: number[] = [];
  for (let i = 1; i < sampleEnd; i++) {
    gaps.push(sortedValuesDesc[i - 1] - sortedValuesDesc[i]);
  }
  gaps.sort((a, b) => a - b);

  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  const threshold = Math.max(
    MIN_TIER_GAP_POINTS,
    TIER_GAP_MULTIPLIER * medianGap
  );

  const tiers: number[] = [1];
  let tier = 1;
  for (let i = 1; i < sortedValuesDesc.length; i++) {
    if (sortedValuesDesc[i - 1] - sortedValuesDesc[i] > threshold) {
      tier += 1;
    }
    tiers.push(tier);
  }

  return tiers;
}

/**
 * Returns a NEW array of player copies ordered by value over replacement,
 * with tier and pRank recomputed for the adjusted order. Players without
 * projections (or whose position has no replacement level) go to the
 * bottom in original-rank order with no tier.
 */
export function applyScarcityAdjustment(
  players: Player[],
  rosterSize: Record<Position, number>,
  numTeams: number
): Player[] {
  const levels = computeReplacementLevels(players, rosterSize, numTeams);

  const valued: { player: Player; value: number }[] = [];
  const unvalued: Player[] = [];

  players.forEach((player) => {
    const level = levels[player.position];
    if (player.projectedPoints !== undefined && level !== undefined) {
      valued.push({ player, value: player.projectedPoints - level });
    } else {
      unvalued.push(player);
    }
  });

  valued.sort((a, b) => b.value - a.value || a.player.rank - b.player.rank);
  unvalued.sort((a, b) => a.rank - b.rank);

  const tiers = computeValueTiers(valued.map((entry) => entry.value));

  const positionCounts: Partial<Record<Position, number>> = {};
  const takePositionRank = (pos: Position) => {
    positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
    return positionCounts[pos]!;
  };

  return [
    ...valued.map((entry, index) => ({
      ...entry.player,
      tier: tiers[index],
      pRank: takePositionRank(entry.player.position),
    })),
    ...unvalued.map((player) => ({
      ...player,
      tier: undefined,
      pRank: takePositionRank(player.position),
    })),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/vorp.ts tests/vorp.test.ts
git commit -m "feat: add scarcity adjustment with value-gap tiers"
```

---

### Task 7: Settings toggle

**Files:**
- Modify: `providers/SettingsProvider.tsx`
- Create: `components/Settings/SettingsScarcitySwitch.tsx`
- Modify: `components/Settings/Settings.tsx`

- [ ] **Step 1: Add state, action, and hydration**

In `providers/SettingsProvider.tsx`:

Add to the `State` type (after `hidePlayerAfterDrafting: boolean;`):

```ts
  useScarcityAdjustment: boolean;
```

Add to the `Action` union (after the `'toggle-hide-player'` entry):

```ts
  | { type: 'toggle-scarcity-adjustment' }
```

In the `'hydrate'` case, next to the `hidePlayerAfterDrafting` coercion, add:

```ts
        action.payload.useScarcityAdjustment =
          !!action.payload.useScarcityAdjustment;
```

Add a reducer case after `'toggle-hide-player'`:

```ts
    case 'toggle-scarcity-adjustment':
      newState = {
        ...state,
        useScarcityAdjustment: !state.useScarcityAdjustment,
      };
      break;
```

Add to the initial state in `useReducer` (after `hidePlayerAfterDrafting: true,`):

```ts
    useScarcityAdjustment: false,
```

- [ ] **Step 2: Create the switch component**

Create `components/Settings/SettingsScarcitySwitch.tsx`:

```tsx
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Switch,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';

const SettingsScarcitySwitch = () => {
  const { state, dispatch } = useSettings();

  return (
    <FormControl>
      <Box display="flex" alignItems="center">
        <FormLabel htmlFor="scarcity-adjusted-rankings" mb={0} mr={2}>
          Scarcity-Adjusted Rankings?
        </FormLabel>
        <Switch
          id="scarcity-adjusted-rankings"
          isChecked={state.useScarcityAdjustment}
          onChange={() => dispatch({ type: 'toggle-scarcity-adjustment' })}
        />
      </Box>
      <FormHelperText>
        Re-orders rankings by value over replacement based on your roster
        configuration and league size (e.g. QBs rise in a 2QB league)
      </FormHelperText>
    </FormControl>
  );
};

export default SettingsScarcitySwitch;
```

- [ ] **Step 3: Mount it in the settings modal**

In `components/Settings/Settings.tsx`, add the import:

```tsx
import SettingsScarcitySwitch from './SettingsScarcitySwitch';
```

and render it directly after `<SettingsHidePlayersSwitch />`:

```tsx
          <SettingsHidePlayersSwitch />
          <SettingsScarcitySwitch />
```

- [ ] **Step 4: Verify in the browser**

Start the dev server preview. Open Settings → confirm the new switch renders, toggles, and persists across a page reload (localStorage `SETTINGS` should contain `"useScarcityAdjustment":true` after toggling on).

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add providers/SettingsProvider.tsx components/Settings/SettingsScarcitySwitch.tsx components/Settings/Settings.tsx
git commit -m "feat: add scarcity-adjusted rankings settings toggle"
```

---

### Task 8: Draft board integration

**Files:**
- Modify: `components/DraftBoard/index.tsx`
- Modify: `components/DraftBoard/DraftBoardRankingRow.tsx`

- [ ] **Step 1: Apply the adjustment in DraftBoard**

In `components/DraftBoard/index.tsx`, add the import:

```tsx
import { applyScarcityAdjustment } from 'utils/vorp';
```

Then insert a derived-rankings memo above the existing `filteredPlayers` memo, and make `filteredPlayers` consume it:

```tsx
  const baseRankings = useMemo(() => {
    if (!settings.useScarcityAdjustment) return draft.rankings;

    return applyScarcityAdjustment(
      draft.rankings,
      settings.rosterSize,
      settings.numTeams
    );
  }, [
    draft.rankings,
    settings.useScarcityAdjustment,
    settings.rosterSize,
    settings.numTeams,
  ]);

  const filteredPlayers = useMemo(() => {
    const players = settings.hidePlayerAfterDrafting
      ? baseRankings.filter(
          (player) => !getters.draftedPlayerIds.has(player.id)
        )
      : baseRankings;

    return players
      .filter((player) => !getters.keeperPlayerIds.has(player.id))
      .filter((player) => player.name.toLowerCase().includes(draft.filter));
  }, [
    baseRankings,
    draft.filter,
    settings.hidePlayerAfterDrafting,
    getters.draftedPlayerIds,
    getters.keeperPlayerIds,
  ]);
```

(The only changes to `filteredPlayers` are `draft.rankings` → `baseRankings` in both the body and the dependency array.)

- [ ] **Step 2: Show the original rank, dimmed, in scarcity mode**

In `components/DraftBoard/DraftBoardRankingRow.tsx`, extend the settings destructuring:

```tsx
  const {
    state: { numTeams, rosterSize, useScarcityAdjustment },
  } = useSettings();
```

and add a dimmed original-rank indicator immediately before the expected-round `<Text>` block (the one gated on `player.adp > 0`):

```tsx
            {useScarcityAdjustment && (
              <Text
                display={['none', 'none', 'block']}
                marginRight={2}
                color="whiteAlpha.500"
                fontSize="sm"
              >
                #{player.rank}
              </Text>
            )}
```

- [ ] **Step 3: Verify end-to-end in the browser**

With the dev server running:

1. Toggle **Scarcity-Adjusted Rankings** off → board matches the source order (compare the top 10 to the untouched list).
2. Toggle on with default roster (1 QB) → order shifts modestly; tier bands are contiguous stripes; each row shows a dimmed `#<original rank>`.
3. Open Settings → set QB roster slots to 2 → QBs jump visibly up the board **without any network request** (confirm via the network panel: no new `/api/rankings` call).
4. Set QB slots back to 1 → QBs drop back down.
5. Set a position (e.g., K) to 0 slots → kickers sink toward the bottom.
6. Confirm position filter, favorites, search filter, and drafting a player all still work in adjusted mode.

- [ ] **Step 4: Run lint and tests**

Run: `npm run lint && npm test`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add components/DraftBoard/index.tsx components/DraftBoard/DraftBoardRankingRow.tsx
git commit -m "feat: re-order draft board by VORP when scarcity mode is on"
```

---

### Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full check**

Run: `npm run lint && npm test && npm run build`
Expected: all PASS. (`next build` type-checks the whole project including the new files.)

Known contingency: the repo pins TypeScript 4.7, and recent vitest versions ship type declarations that may not compile under it. If `next build` fails inside `node_modules/vitest` or on the `tests/` files, add the test files to the `"exclude"` array in `tsconfig.json` — vitest type-checks nothing itself (esbuild strips types), so tests still run fine:

```json
"exclude": ["node_modules", "tests", "vitest.config.ts"]
```

- [ ] **Step 2: Failure-path check**

Temporarily break the Sleeper URL in `utils/projections.ts` (e.g., change the host to `api.sleeper.invalid`), restart the dev server, and load the app:

Expected: rankings still load in source order; the server logs `Failed to fetch projections:`; toggling scarcity mode on leaves the order unchanged (every player is unprojected) rather than crashing.

Revert the URL change afterward and confirm `git status` shows a clean tree apart from intended changes.

- [ ] **Step 3: 2QB sanity comparison**

With scarcity mode on, QB slots = 2, 12 teams, compare the board's first 3 rounds against a public superflex ADP list (e.g., Sleeper's own `adp_2qb` values, visible in the API response). The shape should agree: several QBs in round 1–2 territory that sit in rounds 3–5 of the 1QB source order. Exact order will differ — this is a shape check, not an equality check.

- [ ] **Step 4: Update CLAUDE.md**

Add to the **Core Data Flow** section of `CLAUDE.md`, after the existing data-sources bullet:

```markdown
   - Sleeper API season projections (`utils/projections.ts`) — attached to players
     as `projectedPoints`, cached in-memory for 24h (`utils/cache.ts`)
```

and add a bullet under **Position Management**:

```markdown
- When the "Scarcity-Adjusted Rankings" setting is on, the draft board re-orders
  players client-side by value over replacement (`utils/vorp.ts`) using the roster
  configuration and league size, and recomputes tiers from value gaps
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document scarcity-adjusted rankings in CLAUDE.md"
```
