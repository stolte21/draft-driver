import { mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { DepthChart, DepthChartPlayer, Position } from 'types';
import { parseId } from 'utils';
import { cached } from 'utils/cache';

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
