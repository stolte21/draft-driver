# Player Details Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "View Player Details" action-menu item that opens a modal showing full Sleeper-sourced player info: photo, bio, bye week, current injury, and recent news.

**Architecture:** Extract the Sleeper players-blob fetch into a shared `utils/sleeperPlayers.ts` module (widened field set, 24h cache). A new `GET /api/player-details` route matches a player by normalized name + position (DSTs by team key), merges in a bye week derived from Sleeper's schedule endpoint and news from Sleeper's undocumented GraphQL endpoint (both best-effort), and returns a `PlayerDetails` object. The client adds a fifth menu item wired exactly like Add/Edit Note into a new `PlayerDetailsModal` backed by a react-query hook.

**Tech Stack:** Next.js (pages router), Chakra UI v2, @tanstack/react-query v5, vitest.

**Spec:** `docs/superpowers/specs/2026-08-09-player-details-modal-design.md`

**Branch:** `feature/player-details-modal`

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `utils/sleeperPlayers.ts` | Create | Fetch + cache the Sleeper players blob (moved from depthCharts), widened `SleeperPlayerRecord` |
| `utils/depthCharts.ts` | Modify | Consume `getSleeperPlayers()`; re-export `SleeperPlayerRecord` for existing imports |
| `types/index.ts` | Modify | Add `PlayerDetails`, `PlayerNewsItem` |
| `utils/playerDetails.ts` | Create | Pure logic (matching, bye derivation, response assembly, news parsing) + cached fetchers (schedule, GraphQL news) |
| `pages/api/player-details.ts` | Create | HTTP route: validate → match → assemble |
| `hooks/usePlayerDetails.ts` | Create | react-query fetch hook |
| `components/DraftBoard/PlayerDetailsModal.tsx` | Create | The modal UI |
| `components/DraftBoard/DraftBoardRankingRow.tsx` | Modify | Add menu item + `onViewDetails` prop |
| `components/DraftBoard/DraftBoardList.tsx` | Modify | `detailsPlayer` state, itemData callback, render modal |
| `tests/playerDetails.test.ts` | Create | Unit tests for all pure logic |

Verified API facts baked into this plan (researched 2026-08-09):

- Blob (`https://api.sleeper.app/v1/players/nfl`, ~14MB): skill players keyed by numeric string id; `height`/`weight` are strings of inches/pounds (`"72"`, `"205"`); `metadata.rookie_year` is a string (`"2021"`); DST records are keyed by team abbreviation (`"CIN"`) with `position: "DEF"`, `player_id: "CIN"`, `first_name: "Cincinnati"`, `last_name: "Bengals"`, and **no `full_name`**.
- Schedule (`https://api.sleeper.app/schedule/nfl/regular/{season}`): array of `{week, home, away, status, date, game_id}`; a team's bye is the one week 1–18 it doesn't appear in. Live for 2026.
- News (`POST https://sleeper.com/graphql`, no auth): query `get_player_news(sport: "nfl", player_id: "...", limit: N) { metadata source published }` returns items with `metadata.{title,description,analysis?,url}`, `source` (string), `published` (epoch ms). Undocumented — every failure must degrade to `[]`.
- Photos: `https://sleepercdn.com/content/nfl/players/{player_id}.jpg` (200 verified); team logos: `https://sleepercdn.com/images/team_logos/nfl/{lowercase team}.png`.

---

### Task 1: Extract shared Sleeper players module

**Files:**
- Create: `utils/sleeperPlayers.ts`
- Modify: `utils/depthCharts.ts`
- Test: existing `tests/depthCharts.test.ts` (must keep passing unchanged)

This is a refactor guarded by existing tests — no new tests in this task.

- [ ] **Step 1: Create `utils/sleeperPlayers.ts`**

Move the fetch/disk-cache logic out of `utils/depthCharts.ts` (currently lines 19–26 and 68–128) and widen the record type. Records are narrowed after fetch so the 24h in-memory cache holds ~20 fields per player instead of the full raw blob.

```ts
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { cached } from 'utils/cache';

// The subset of a Sleeper players-endpoint record this app reads.
export type SleeperPlayerRecord = {
  player_id?: string | null;
  active?: boolean | null;
  status?: string | null;
  team?: string | null;
  position?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  number?: number | null;
  age?: number | null;
  birth_date?: string | null;
  height?: string | null;
  weight?: string | null;
  college?: string | null;
  years_exp?: number | null;
  search_rank?: number | null;
  injury_status?: string | null;
  injury_body_part?: string | null;
  injury_notes?: string | null;
  injury_start_date?: string | null;
  depth_chart_position?: string | null;
  depth_chart_order?: number | null;
  metadata?: { rookie_year?: string | null } | null;
};

const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';
const SLEEPER_PLAYERS_TTL_MS = 24 * 60 * 60 * 1000;
// larger timeout than projections — this payload is ~14MB
const SLEEPER_TIMEOUT_MS = 30_000;
const DISK_CACHE_PATH = join(process.cwd(), '.cache', 'sleeper-players.json');

async function fetchSleeperPlayers(): Promise<Record<string, any>> {
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

function readDiskCache(): Record<string, any> | null {
  try {
    const stats = statSync(DISK_CACHE_PATH);
    if (Date.now() - stats.mtimeMs > SLEEPER_PLAYERS_TTL_MS) return null;
    return JSON.parse(readFileSync(DISK_CACHE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function writeDiskCache(players: Record<string, any>) {
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
async function loadSleeperPlayers(): Promise<Record<string, any>> {
  if (process.env.NODE_ENV === 'production') {
    return fetchSleeperPlayers();
  }

  const fromDisk = readDiskCache();
  if (fromDisk) return fromDisk;

  const players = await fetchSleeperPlayers();
  writeDiskCache(players);
  return players;
}

function narrowRecord(raw: any): SleeperPlayerRecord {
  return {
    player_id: raw.player_id ?? null,
    active: raw.active ?? null,
    status: raw.status ?? null,
    team: raw.team ?? null,
    position: raw.position ?? null,
    full_name: raw.full_name ?? null,
    first_name: raw.first_name ?? null,
    last_name: raw.last_name ?? null,
    number: raw.number ?? null,
    age: raw.age ?? null,
    birth_date: raw.birth_date ?? null,
    height: raw.height ?? null,
    weight: raw.weight ?? null,
    college: raw.college ?? null,
    years_exp: raw.years_exp ?? null,
    search_rank: raw.search_rank ?? null,
    injury_status: raw.injury_status ?? null,
    injury_body_part: raw.injury_body_part ?? null,
    injury_notes: raw.injury_notes ?? null,
    injury_start_date: raw.injury_start_date ?? null,
    depth_chart_position: raw.depth_chart_position ?? null,
    depth_chart_order: raw.depth_chart_order ?? null,
    metadata: raw.metadata
      ? { rookie_year: raw.metadata.rookie_year ?? null }
      : null,
  };
}

/**
 * The Sleeper players blob, narrowed to the fields this app reads and
 * cached in-memory for 24h. Shared by depth charts and player details.
 */
export async function getSleeperPlayers(): Promise<
  Record<string, SleeperPlayerRecord>
> {
  return cached('sleeper-players', SLEEPER_PLAYERS_TTL_MS, async () => {
    const raw = await loadSleeperPlayers();
    const narrowed: Record<string, SleeperPlayerRecord> = {};
    for (const [id, record] of Object.entries(raw)) {
      narrowed[id] = narrowRecord(record);
    }
    return narrowed;
  });
}
```

- [ ] **Step 2: Rewrite `utils/depthCharts.ts` to consume the shared module**

Delete lines 1–2 (fs/path imports), 19–26 (the old `SleeperPlayerRecord`), and 68–128 (URL/timeout/disk-cache constants, `fetchSleeperPlayers`, `readDiskCache`, `writeDiskCache`, `loadSleeperPlayers`). The file becomes:

```ts
import { DepthChart, DepthChartPlayer, Position } from 'types';
import { parseId } from 'utils';
import { cached } from 'utils/cache';
import { getSleeperPlayers, SleeperPlayerRecord } from 'utils/sleeperPlayers';

// Re-exported so existing consumers/tests keep importing from here.
export type { SleeperPlayerRecord } from 'utils/sleeperPlayers';

export const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
] as const;

const TEAM_SET = new Set<string>(NFL_TEAMS);

const DEPTH_CHART_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];
const POSITION_SET = new Set<string>(DEPTH_CHART_POSITIONS);

const DEPTH_CHARTS_TTL_MS = 24 * 60 * 60 * 1000;

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

export async function getDepthCharts(): Promise<DepthChart[]> {
  return cached('depth-charts', DEPTH_CHARTS_TTL_MS, async () =>
    buildDepthCharts(await getSleeperPlayers())
  );
}
```

Note the direct `import { getSleeperPlayers, SleeperPlayerRecord }` plus the `export type` re-export — `tests/depthCharts.test.ts` imports `SleeperPlayerRecord` from `utils/depthCharts` and must not change.

- [ ] **Step 3: Run the existing test suite**

Run: `npm test`
Expected: all existing tests PASS (boris, cache, depthCharts, draftReducer, projections, settingsReducer, staleness, vorp). If depthCharts tests fail, the refactor broke something — fix before proceeding.

- [ ] **Step 4: Commit**

```bash
git add utils/sleeperPlayers.ts utils/depthCharts.ts
git commit -m "refactor: extract shared Sleeper players module from depth charts"
```

---

### Task 2: Add PlayerDetails types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Append the new types to `types/index.ts`**

Add at the end of the file:

```ts
export type PlayerNewsItem = {
  title: string;
  description: string | null;
  analysis: string | null;
  source: string;
  url: string | null;
  published: number; // epoch ms
};

export type PlayerDetails = {
  playerId: string;
  name: string;
  team: string | null;
  position: string;
  number: number | null;
  age: number | null;
  birthDate: string | null;
  heightIn: number | null;
  weightLb: number | null;
  college: string | null;
  yearsExp: number | null;
  rookieYear: number | null; // year drafted, from metadata.rookie_year
  status: string | null; // Active, Inactive, Injured Reserve, ...
  depthChartPosition: string | null;
  depthChartOrder: number | null;
  injury: {
    status: string;
    bodyPart: string | null;
    notes: string | null;
    startDate: string | null;
  } | null;
  byeWeek: number | null;
  photoUrl: string;
  news: PlayerNewsItem[];
};
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add PlayerDetails and PlayerNewsItem types"
```

---

### Task 3: Pure player-details logic (TDD)

**Files:**
- Create: `utils/playerDetails.ts`
- Test: `tests/playerDetails.test.ts`

Four pure functions: `deriveByeWeeks`, `findSleeperPlayer`, `buildPlayerDetails`, `parseNewsItems`. Write all the tests first, watch them fail, then implement.

- [ ] **Step 1: Write the failing tests**

Create `tests/playerDetails.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildPlayerDetails,
  deriveByeWeeks,
  findSleeperPlayer,
  parseNewsItems,
  ScheduleGame,
} from '../utils/playerDetails';
import { SleeperPlayerRecord } from '../utils/sleeperPlayers';

function game(week: number, home: string, away: string): ScheduleGame {
  return { week, home, away };
}

describe('deriveByeWeeks', () => {
  it('reports the single missing week per team', () => {
    // 3-week season: CIN misses week 2, PIT misses week 3, BAL/CLE play all 3
    const schedule = [
      game(1, 'CIN', 'PIT'),
      game(1, 'BAL', 'CLE'),
      game(2, 'BAL', 'PIT'),
      game(2, 'CLE', 'BAL'),
      game(3, 'CIN', 'BAL'),
      game(3, 'CLE', 'CIN'),
    ];
    const byes = deriveByeWeeks(schedule);

    expect(byes.CIN).toBe(2);
    expect(byes.PIT).toBe(3);
    expect(byes.BAL).toBeUndefined();
    expect(byes.CLE).toBeUndefined();
  });

  it('omits teams missing more than one week rather than guessing', () => {
    const schedule = [game(1, 'CIN', 'PIT'), game(4, 'CIN', 'PIT')];
    const byes = deriveByeWeeks(schedule);

    expect(byes.CIN).toBeUndefined();
    expect(byes.PIT).toBeUndefined();
  });

  it('returns an empty object for an empty schedule', () => {
    expect(deriveByeWeeks([])).toEqual({});
  });
});

function player(overrides: Partial<SleeperPlayerRecord>): SleeperPlayerRecord {
  return {
    player_id: '1',
    active: true,
    position: 'WR',
    full_name: 'Test Player',
    team: 'CIN',
    search_rank: 100,
    ...overrides,
  };
}

describe('findSleeperPlayer', () => {
  it('matches skill players by normalized name and position', () => {
    const records = {
      '7564': player({
        player_id: '7564',
        full_name: "Ja'Marr Chase",
        position: 'WR',
      }),
    };

    const found = findSleeperPlayer(records, {
      name: 'JaMarr Chase',
      position: 'WR',
    });

    expect(found?.player_id).toBe('7564');
  });

  it('ignores name suffixes like III', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Kenneth Walker III' }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Kenneth Walker',
      position: 'WR',
    });

    expect(found?.player_id).toBe('1');
  });

  it('requires the position to match', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Josh Allen', position: 'QB' }),
    };

    expect(
      findSleeperPlayer(records, { name: 'Josh Allen', position: 'WR' })
    ).toBeNull();
  });

  it('prefers the lower search_rank on duplicate names', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Mike Williams', search_rank: 5000 }),
      '2': player({ player_id: '2', full_name: 'Mike Williams', search_rank: 120 }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Mike Williams',
      position: 'WR',
    });

    expect(found?.player_id).toBe('2');
  });

  it('matches DSTs by team key', () => {
    const records = {
      CIN: player({
        player_id: 'CIN',
        position: 'DEF',
        full_name: null,
        first_name: 'Cincinnati',
        last_name: 'Bengals',
      }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Cincinnati Bengals',
      position: 'DST',
      team: 'CIN',
    });

    expect(found?.player_id).toBe('CIN');
  });

  it('returns null for a DST query without a team', () => {
    expect(findSleeperPlayer({}, { name: 'Bengals', position: 'DST' })).toBeNull();
  });
});

describe('buildPlayerDetails', () => {
  it('assembles details from a skill-player record', () => {
    const record = player({
      player_id: '7564',
      full_name: "Ja'Marr Chase",
      position: 'WR',
      team: 'CIN',
      number: 1,
      age: 26,
      birth_date: '2000-03-01',
      height: '72',
      weight: '205',
      college: 'LSU',
      years_exp: 5,
      status: 'Active',
      depth_chart_position: 'LWR',
      depth_chart_order: 1,
      metadata: { rookie_year: '2021' },
    });

    const details = buildPlayerDetails(record, 6, []);

    expect(details).toEqual({
      playerId: '7564',
      name: "Ja'Marr Chase",
      team: 'CIN',
      position: 'WR',
      number: 1,
      age: 26,
      birthDate: '2000-03-01',
      heightIn: 72,
      weightLb: 205,
      college: 'LSU',
      yearsExp: 5,
      rookieYear: 2021,
      status: 'Active',
      depthChartPosition: 'LWR',
      depthChartOrder: 1,
      injury: null,
      byeWeek: 6,
      photoUrl: 'https://sleepercdn.com/content/nfl/players/7564.jpg',
      news: [],
    });
  });

  it('maps injury fields when injury_status is set', () => {
    const record = player({
      injury_status: 'PUP',
      injury_body_part: 'Knee - ACL',
      injury_notes: 'Surgery',
    });

    const details = buildPlayerDetails(record, null, []);

    expect(details.injury).toEqual({
      status: 'PUP',
      bodyPart: 'Knee - ACL',
      notes: 'Surgery',
      startDate: null,
    });
  });

  it('builds DST details with a team-logo photo and DST position', () => {
    const record = player({
      player_id: 'CIN',
      position: 'DEF',
      full_name: null,
      first_name: 'Cincinnati',
      last_name: 'Bengals',
      team: 'CIN',
      height: null,
      weight: null,
    });

    const details = buildPlayerDetails(record, 6, []);

    expect(details.name).toBe('Cincinnati Bengals');
    expect(details.position).toBe('DST');
    expect(details.photoUrl).toBe(
      'https://sleepercdn.com/images/team_logos/nfl/cin.png'
    );
    expect(details.heightIn).toBeNull();
    expect(details.weightLb).toBeNull();
  });

  it('nulls out unparseable numeric strings', () => {
    const record = player({ height: 'tall', metadata: { rookie_year: '' } });

    const details = buildPlayerDetails(record, null, []);

    expect(details.heightIn).toBeNull();
    expect(details.rookieYear).toBeNull();
  });
});

describe('parseNewsItems', () => {
  it('parses a GraphQL news payload', () => {
    const payload = {
      data: {
        get_player_news: [
          {
            metadata: {
              title: 'Chase Sets the Market',
              description: 'A description.',
              analysis: 'Some analysis.',
              url: 'https://example.com/story',
            },
            source: 'rotoballer',
            published: 1784906886000,
          },
        ],
      },
    };

    expect(parseNewsItems(payload)).toEqual([
      {
        title: 'Chase Sets the Market',
        description: 'A description.',
        analysis: 'Some analysis.',
        source: 'rotoballer',
        url: 'https://example.com/story',
        published: 1784906886000,
      },
    ]);
  });

  it('tolerates missing optional fields', () => {
    const payload = {
      data: {
        get_player_news: [
          { metadata: { title: 'Bare item' }, source: 'nfl', published: 123 },
        ],
      },
    };

    expect(parseNewsItems(payload)).toEqual([
      {
        title: 'Bare item',
        description: null,
        analysis: null,
        source: 'nfl',
        url: null,
        published: 123,
      },
    ]);
  });

  it('drops malformed items and returns [] for garbage payloads', () => {
    expect(parseNewsItems(null)).toEqual([]);
    expect(parseNewsItems({})).toEqual([]);
    expect(parseNewsItems({ data: { get_player_news: 'nope' } })).toEqual([]);
    expect(
      parseNewsItems({
        data: { get_player_news: [{ source: 'x', published: 1 }] },
      })
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/playerDetails.test.ts`
Expected: FAIL — cannot resolve `../utils/playerDetails`.

- [ ] **Step 3: Implement the pure functions**

Create `utils/playerDetails.ts`:

```ts
import { PlayerDetails, PlayerNewsItem } from 'types';
import { normalizePlayerName } from 'utils/projections';
import { SleeperPlayerRecord } from 'utils/sleeperPlayers';

export type ScheduleGame = { week: number; home: string; away: string };

const PLAYER_PHOTO_BASE = 'https://sleepercdn.com/content/nfl/players';
const TEAM_LOGO_BASE = 'https://sleepercdn.com/images/team_logos/nfl';

/**
 * A team's bye is the single week (1..last) it doesn't appear in the
 * schedule. Teams with zero or 2+ missing weeks (partial schedules) are
 * omitted rather than guessed.
 */
export function deriveByeWeeks(games: ScheduleGame[]): Record<string, number> {
  const weeksByTeam = new Map<string, Set<number>>();
  let lastWeek = 0;

  for (const game of games) {
    lastWeek = Math.max(lastWeek, game.week);
    for (const team of [game.home, game.away]) {
      const weeks = weeksByTeam.get(team) ?? new Set<number>();
      weeks.add(game.week);
      weeksByTeam.set(team, weeks);
    }
  }

  const byes: Record<string, number> = {};
  weeksByTeam.forEach((weeks, team) => {
    const missing: number[] = [];
    for (let week = 1; week <= lastWeek; week++) {
      if (!weeks.has(week)) missing.push(week);
    }
    if (missing.length === 1) byes[team] = missing[0];
  });

  return byes;
}

/**
 * Skill players match by normalized name + position (Player.id is
 * name-derived, so name+position is the join key — same normalization as
 * the projections merge). DST records are keyed by team abbreviation.
 * Duplicate names are disambiguated by Sleeper's search_rank (lower is
 * more relevant; retired/practice-squad players rank far higher).
 */
export function findSleeperPlayer(
  records: Record<string, SleeperPlayerRecord>,
  query: { name: string; position: string; team?: string }
): SleeperPlayerRecord | null {
  if (query.position === 'DST') {
    return (query.team && records[query.team]) || null;
  }

  const target = normalizePlayerName(query.name);
  let best: SleeperPlayerRecord | null = null;

  for (const record of Object.values(records)) {
    if (record.position !== query.position) continue;
    if (!record.full_name) continue;
    if (normalizePlayerName(record.full_name) !== target) continue;

    const bestRank = best?.search_rank ?? Number.MAX_SAFE_INTEGER;
    const rank = record.search_rank ?? Number.MAX_SAFE_INTEGER;
    if (!best || rank < bestRank) best = record;
  }

  return best;
}

function parseIntOrNull(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPlayerDetails(
  record: SleeperPlayerRecord,
  byeWeek: number | null,
  news: PlayerNewsItem[]
): PlayerDetails {
  const playerId = record.player_id ?? '';
  const isTeamDefense = record.position === 'DEF';
  const name =
    record.full_name ??
    [record.first_name, record.last_name].filter(Boolean).join(' ');

  return {
    playerId,
    name,
    team: record.team ?? null,
    position: isTeamDefense ? 'DST' : record.position ?? '',
    number: record.number ?? null,
    age: record.age ?? null,
    birthDate: record.birth_date ?? null,
    heightIn: parseIntOrNull(record.height),
    weightLb: parseIntOrNull(record.weight),
    college: record.college ?? null,
    yearsExp: record.years_exp ?? null,
    rookieYear: parseIntOrNull(record.metadata?.rookie_year),
    status: record.status ?? null,
    depthChartPosition: record.depth_chart_position ?? null,
    depthChartOrder: record.depth_chart_order ?? null,
    injury: record.injury_status
      ? {
          status: record.injury_status,
          bodyPart: record.injury_body_part ?? null,
          notes: record.injury_notes ?? null,
          startDate: record.injury_start_date ?? null,
        }
      : null,
    byeWeek,
    photoUrl: isTeamDefense
      ? `${TEAM_LOGO_BASE}/${playerId.toLowerCase()}.png`
      : `${PLAYER_PHOTO_BASE}/${playerId}.jpg`,
    news,
  };
}

export function parseNewsItems(raw: unknown): PlayerNewsItem[] {
  const items = (raw as any)?.data?.get_player_news;
  if (!Array.isArray(items)) return [];

  return items
    .map((item: any): PlayerNewsItem | null => {
      const title = item?.metadata?.title;
      if (typeof title !== 'string' || typeof item?.source !== 'string') {
        return null;
      }
      return {
        title,
        description:
          typeof item.metadata.description === 'string'
            ? item.metadata.description
            : null,
        analysis:
          typeof item.metadata.analysis === 'string'
            ? item.metadata.analysis
            : null,
        source: item.source,
        url: typeof item.metadata.url === 'string' ? item.metadata.url : null,
        published: typeof item.published === 'number' ? item.published : 0,
      };
    })
    .filter((item): item is PlayerNewsItem => item !== null);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/playerDetails.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add utils/playerDetails.ts tests/playerDetails.test.ts
git commit -m "feat: add player-details matching, bye derivation, and news parsing"
```

---

### Task 4: Cached fetchers for schedule and news

**Files:**
- Modify: `utils/playerDetails.ts`

Thin fetch wrappers around the pure functions from Task 3; the parse logic they delegate to is already unit-tested, and the codebase does not mock HTTP in tests (boris/projections fetchers are untested too), so no new tests here.

- [ ] **Step 1: Add the fetchers to `utils/playerDetails.ts`**

Add to the imports at the top:

```ts
import { cached } from 'utils/cache';
```

Append at the bottom of the file:

```ts
const SCHEDULE_URL_BASE = 'https://api.sleeper.app/schedule/nfl/regular';
const GRAPHQL_URL = 'https://sleeper.com/graphql';
const SCHEDULE_TTL_MS = 24 * 60 * 60 * 1000;
const NEWS_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

export async function getByeWeeks(
  season: number
): Promise<Record<string, number>> {
  return cached(`bye-weeks-${season}`, SCHEDULE_TTL_MS, async () => {
    // AbortSignal.timeout is supported at runtime (Node 18+) but isn't in
    // the DOM lib types bundled with this TS version.
    const response = await fetch(`${SCHEDULE_URL_BASE}/${season}`, {
      signal: (AbortSignal as any).timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Sleeper schedule request failed: ${response.status}`);
    }

    return deriveByeWeeks(await response.json());
  });
}

/**
 * Sleeper's GraphQL endpoint is undocumented — any failure (endpoint
 * change, timeout, unexpected shape) degrades to an empty news list
 * rather than failing the player-details request.
 */
export async function fetchPlayerNews(
  playerId: string
): Promise<PlayerNewsItem[]> {
  if (!/^[A-Za-z0-9]+$/.test(playerId)) return [];

  try {
    return await cached(`player-news-${playerId}`, NEWS_TTL_MS, async () => {
      const query = `query get_player_news { get_player_news(sport: "nfl", player_id: "${playerId}", limit: 5) { metadata source published } }`;
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: (AbortSignal as any).timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Sleeper news request failed: ${response.status}`);
      }

      return parseNewsItems(await response.json());
    });
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Verify the suite still passes and the code compiles**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add utils/playerDetails.ts
git commit -m "feat: add cached bye-week and player-news fetchers"
```

---

### Task 5: API route

**Files:**
- Create: `pages/api/player-details.ts`

- [ ] **Step 1: Create the route**

```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PlayerDetails } from 'types';
import {
  buildPlayerDetails,
  fetchPlayerNews,
  findSleeperPlayer,
  getByeWeeks,
} from 'utils/playerDetails';
import { getSleeperPlayers } from 'utils/sleeperPlayers';

const VALID_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DST']);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerDetails | { error: string }>
) {
  const { name, position, team } = req.query;

  if (typeof name !== 'string' || name.length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof position !== 'string' || !VALID_POSITIONS.has(position)) {
    res
      .status(400)
      .json({ error: 'position must be one of QB/RB/WR/TE/K/DST' });
    return;
  }

  let players;
  try {
    players = await getSleeperPlayers();
  } catch (error) {
    console.error('Failed to load Sleeper players', error);
    res.status(502).json({ error: 'Failed to load player data' });
    return;
  }

  const record = findSleeperPlayer(players, {
    name,
    position,
    team: typeof team === 'string' ? team : undefined,
  });

  if (!record) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  // both enrichments are best-effort: bye week falls back to null and
  // news to [] (fetchPlayerNews never throws)
  const [byeWeeks, news] = await Promise.all([
    getByeWeeks(new Date().getFullYear()).catch(
      () => ({}) as Record<string, number>
    ),
    fetchPlayerNews(record.player_id ?? ''),
  ]);

  const byeWeek = record.team ? byeWeeks[record.team] ?? null : null;

  res.status(200).json(buildPlayerDetails(record, byeWeek, news));
}
```

- [ ] **Step 2: Smoke-test the route against the real dev server**

Run: `npm run dev` in the background, wait for it to boot, then:

```bash
curl -s "http://localhost:3000/api/player-details?name=Ja'Marr%20Chase&position=WR" | head -c 600
```

Expected: JSON starting with `{"playerId":"7564","name":"Ja'Marr Chase","team":"CIN","position":"WR",...` including `"byeWeek":` with a number and (usually) a non-empty `news` array.

```bash
curl -s "http://localhost:3000/api/player-details?name=Bengals&position=DST&team=CIN" | head -c 400
```

Expected: `"position":"DST"`, `"photoUrl":"https://sleepercdn.com/images/team_logos/nfl/cin.png"`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/player-details?name=Nobody%20Real&position=QB"
```

Expected: `404`. Stop the dev server afterwards.

- [ ] **Step 3: Commit**

```bash
git add pages/api/player-details.ts
git commit -m "feat: add /api/player-details endpoint"
```

---

### Task 6: usePlayerDetails hook

**Files:**
- Create: `hooks/usePlayerDetails.ts`

- [ ] **Step 1: Create the hook**

Mirrors `hooks/useRankings.ts` conventions:

```ts
import { useQuery } from '@tanstack/react-query';
import { Player, PlayerDetails } from 'types';

export const NOT_FOUND_ERROR = 'not-found';

function usePlayerDetails(player: Player | null) {
  return useQuery<PlayerDetails>({
    queryKey: [
      'player-details',
      player?.name,
      player?.position,
      player?.team,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        name: player!.name,
        position: player!.position,
      });
      if (player!.team) params.set('team', player!.team);

      const response = await fetch(`/api/player-details?${params}`);

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? NOT_FOUND_ERROR
            : 'There was an error fetching player details'
        );
      }

      return response.json();
    },
    enabled: player !== null,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

export default usePlayerDetails;
```

`retry: false` so a 404 doesn't hammer the endpoint three times before showing the fallback.

- [ ] **Step 2: Commit**

```bash
git add hooks/usePlayerDetails.ts
git commit -m "feat: add usePlayerDetails hook"
```

---

### Task 7: PlayerDetailsModal component

**Files:**
- Create: `components/DraftBoard/PlayerDetailsModal.tsx`

- [ ] **Step 1: Create the component**

Copies `PlayerNoteModal`'s conventions: nullable-player `isOpen`, `displayPlayer` trick for the close animation, `size={['xs','sm','lg']}`.

```tsx
import { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Text,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import usePlayerDetails, { NOT_FOUND_ERROR } from 'hooks/usePlayerDetails';
import { Player, PlayerDetails } from 'types';

type PlayerDetailsModalProps = {
  player: Player | null;
  onClose: () => void;
};

function formatHeight(heightIn: number | null): string | null {
  if (heightIn == null) return null;
  return `${Math.floor(heightIn / 12)}'${heightIn % 12}"`;
}

function formatYearsPro(yearsExp: number | null): string | null {
  if (yearsExp == null) return null;
  if (yearsExp === 0) return 'Rookie';
  return `${yearsExp} ${yearsExp === 1 ? 'year' : 'years'}`;
}

const StatItem = (props: { label: string; value: string | null }) => {
  if (props.value == null) return null;
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" textTransform="uppercase">
        {props.label}
      </Text>
      <Text>{props.value}</Text>
    </Box>
  );
};

const DetailsBody = (props: { details: PlayerDetails }) => {
  const { details } = props;

  return (
    <>
      <Flex gap={4} alignItems="center">
        <Avatar
          size="xl"
          name={details.name}
          src={details.photoUrl}
          backgroundColor="gray.600"
        />
        <Box>
          <Heading size="md">{details.name}</Heading>
          <Text color="gray.500">
            {[
              details.team,
              details.position,
              details.number != null ? `#${details.number}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {details.injury && (
            <Badge colorScheme="red" marginTop={1}>
              {details.injury.status}
              {details.injury.bodyPart && ` — ${details.injury.bodyPart}`}
            </Badge>
          )}
        </Box>
      </Flex>

      {details.injury?.notes && (
        <Text fontSize="sm" color="gray.500" marginTop={2}>
          {details.injury.notes}
        </Text>
      )}

      <SimpleGrid columns={[2, 3]} spacing={4} marginTop={6}>
        <StatItem
          label="Bye Week"
          value={details.byeWeek != null ? `Week ${details.byeWeek}` : null}
        />
        <StatItem
          label="Age"
          value={details.age != null ? `${details.age}` : null}
        />
        <StatItem label="Height" value={formatHeight(details.heightIn)} />
        <StatItem
          label="Weight"
          value={details.weightLb != null ? `${details.weightLb} lb` : null}
        />
        <StatItem label="College" value={details.college} />
        <StatItem label="Years Pro" value={formatYearsPro(details.yearsExp)} />
        <StatItem
          label="Drafted"
          value={details.rookieYear != null ? `${details.rookieYear}` : null}
        />
        <StatItem
          label="Depth Chart"
          value={
            details.depthChartPosition != null &&
            details.depthChartOrder != null
              ? `${details.depthChartPosition} ${details.depthChartOrder}`
              : null
          }
        />
        <StatItem label="Status" value={details.status} />
      </SimpleGrid>

      {details.news.length > 0 && (
        <>
          <Divider marginY={6} />
          <Heading size="sm" marginBottom={4}>
            Recent News
          </Heading>
          <Flex flexDirection="column" gap={5}>
            {details.news.map((item, index) => (
              <Box key={index}>
                <Text fontWeight="bold">
                  {item.url ? (
                    <Link href={item.url} isExternal>
                      {item.title} <ExternalLinkIcon marginX={1} />
                    </Link>
                  ) : (
                    item.title
                  )}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {item.source}
                  {item.published > 0 &&
                    ` · ${new Date(item.published).toLocaleDateString()}`}
                </Text>
                {(item.description || item.analysis) && (
                  <Text fontSize="sm" marginTop={1} noOfLines={4}>
                    {item.description ?? item.analysis}
                  </Text>
                )}
              </Box>
            ))}
          </Flex>
        </>
      )}
    </>
  );
};

const LoadingBody = () => (
  <>
    <Flex gap={4} alignItems="center">
      <SkeletonCircle size="24" />
      <Box flexGrow={1}>
        <Skeleton height={5} width="60%" marginBottom={2} />
        <Skeleton height={4} width="40%" />
      </Box>
    </Flex>
    <SkeletonText marginTop={6} noOfLines={4} spacing={4} />
  </>
);

const FallbackBody = (props: { player: Player }) => (
  <>
    <Text>
      {[props.player.team, props.player.position]
        .filter(Boolean)
        .join(' · ')}
    </Text>
    <Text color="gray.500" marginTop={2}>
      No additional details found for this player.
    </Text>
  </>
);

const PlayerDetailsModal = (props: PlayerDetailsModalProps) => {
  const [displayPlayer, setDisplayPlayer] = useState<Player | null>(null);

  // keep the last player around so the modal doesn't blank out while
  // Chakra plays the close animation after `player` goes back to null.
  useEffect(() => {
    if (props.player) {
      setDisplayPlayer(props.player);
    }
  }, [props.player]);

  const query = usePlayerDetails(props.player);
  const isNotFound =
    query.error instanceof Error && query.error.message === NOT_FOUND_ERROR;

  return (
    <Modal
      isOpen={props.player !== null}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Player Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody paddingBottom={6}>
          {query.isLoading && <LoadingBody />}
          {query.data && <DetailsBody details={query.data} />}
          {query.error && displayPlayer && (
            <>
              <Heading size="md" marginBottom={2}>
                {displayPlayer.name}
              </Heading>
              {isNotFound ? (
                <FallbackBody player={displayPlayer} />
              ) : (
                <Text color="gray.500">
                  There was an error fetching player details.
                </Text>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PlayerDetailsModal;
```

- [ ] **Step 2: Commit**

```bash
git add components/DraftBoard/PlayerDetailsModal.tsx
git commit -m "feat: add PlayerDetailsModal component"
```

---

### Task 8: Wire menu item and list state

**Files:**
- Modify: `components/DraftBoard/DraftBoardRankingRow.tsx`
- Modify: `components/DraftBoard/DraftBoardList.tsx`

- [ ] **Step 1: Add the callback prop and menu item to `DraftBoardRankingRow.tsx`**

Extend the props type (currently lines 21–24):

```ts
type DraftBoardRankingRowProps = {
  players: Player[];
  onEditNote: (player: Player) => void;
  onViewDetails: (player: Player) => void;
};
```

Add a fifth `MenuItem` after "Add as Keeper" (after current line 266, inside `MenuList`):

```tsx
          <MenuItem onClick={() => props.data.onViewDetails(player)}>
            View Player Details
          </MenuItem>
```

- [ ] **Step 2: Add state, itemData, and modal render to `DraftBoardList.tsx`**

Add the import next to the `PlayerNoteModal` import (line 10):

```ts
import PlayerDetailsModal from 'components/DraftBoard/PlayerDetailsModal';
```

Add state next to `notePlayer` (line 38):

```ts
  const [detailsPlayer, setDetailsPlayer] = useState<Player | null>(null);
```

Extend `itemData` (lines 118–121):

```ts
                itemData={{
                  players: filteredPlayers,
                  onEditNote: setNotePlayer,
                  onViewDetails: setDetailsPlayer,
                }}
```

Render the modal next to `PlayerNoteModal` (inside the existing `props.variant === 'rankings'` block, lines 130–135):

```tsx
      {props.variant === 'rankings' && (
        <>
          <PlayerNoteModal
            player={notePlayer}
            onClose={() => setNotePlayer(null)}
          />
          <PlayerDetailsModal
            player={detailsPlayer}
            onClose={() => setDetailsPlayer(null)}
          />
        </>
      )}
```

Note: `DraftBoardPickRow`/`DraftBoardKeeperRow` receive the same `itemData` object but type their own subset of it — passing the extra callback is fine and requires no changes there. If TypeScript complains about the shared `itemData` shape, check how those two rows type `ListChildComponentProps` and widen only if the compiler forces it.

- [ ] **Step 3: Verify compile + lint**

Run: `npm run lint`
Expected: no errors (warnings pre-existing at worst).

- [ ] **Step 4: Commit**

```bash
git add components/DraftBoard/DraftBoardRankingRow.tsx components/DraftBoard/DraftBoardList.tsx
git commit -m "feat: add View Player Details action to the player menu"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS, including the new `tests/playerDetails.test.ts`.

- [ ] **Step 2: Lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 3: Manual verification in the browser**

Start the dev server and verify in the preview browser:

1. Open the draft board, click a top player's row to open the action menu, click **View Player Details**.
2. Confirm: photo renders, name/team/position header, bye week shows `Week N`, stat grid populated (age, height like `6'0"`, weight, college, years pro, drafted year), news section lists items with source + date, external links work.
3. Try an injured player (look for one, or verify the injury badge logic by picking a player with a known designation) — badge shows status and body part.
4. Try a DST row — team logo, `DST` position, bye week; bio stats absent; no crash if news is empty.
5. Close and reopen on another player — no stale content flash from the previous player beyond the loading skeleton.
6. Check the browser console and server logs for errors.

- [ ] **Step 4: Commit any fixes, then hand off**

If manual verification surfaced fixes, commit them. The branch is then ready for the superpowers:finishing-a-development-branch flow (PR to main).
