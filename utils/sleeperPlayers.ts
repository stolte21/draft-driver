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

  const payload = await response.json();
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error('Unexpected Sleeper players payload');
  }

  return payload;
}

function readDiskCache(): Record<string, SleeperPlayerRecord> | null {
  try {
    const stats = statSync(DISK_CACHE_PATH);
    if (Date.now() - stats.mtimeMs > SLEEPER_PLAYERS_TTL_MS) return null;
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
  if (process.env.NODE_ENV !== 'development') {
    return fetchSleeperPlayers();
  }

  const fromDisk = readDiskCache();
  if (fromDisk) return fromDisk;

  const players = await fetchSleeperPlayers();
  writeDiskCache(players);
  return players;
}

// Explicit object literal is intentional: a dynamic key-loop produces
// dictionary-mode objects that retain ~3x the memory, so the enumeration
// ensures compact memory for the 24h cache.
function narrowRecord(raw: SleeperPlayerRecord): SleeperPlayerRecord {
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
 * The returned map is shared by all callers via the cache — treat records
 * as immutable, never mutate them.
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
