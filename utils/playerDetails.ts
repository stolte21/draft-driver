import { PlayerDetails, PlayerNewsItem } from 'types';
import { cached } from 'utils/cache';
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
    // Real NFL byes never fall in week 1, so a lone missing week 1 signals
    // bad/partial data rather than an actual bye — omit it.
    if (missing.length === 1 && missing[0] !== 1) byes[team] = missing[0];
  });

  return byes;
}

/**
 * Skill players match by normalized name + position (Player.id is
 * name-derived, so name+position is the join key — same normalization as
 * the projections merge). DST records are keyed by team abbreviation and
 * must actually be a DEF record (guards against a team key that happens to
 * collide with a numeric player id).
 *
 * Duplicate names are disambiguated by a (teamMatches, search_rank) tuple,
 * compared lexicographically: a candidate whose team matches query.team
 * always wins first, regardless of search_rank — e.g. active "Frank Gore
 * Jr." (BUF) must beat retired "Frank Gore", even though the retired
 * player's search_rank is numerically lower. Only once team match is tied
 * does the lower search_rank (more relevant; retired/practice-squad
 * players rank far higher, and a missing search_rank ranks worst of all)
 * break the tie. When query.team is undefined, every candidate's team
 * score is equal, so behavior falls back to search_rank-only ranking.
 */
export function findSleeperPlayer(
  records: Record<string, SleeperPlayerRecord>,
  query: { name: string; position: string; team?: string }
): SleeperPlayerRecord | null {
  if (query.position === 'DST') {
    if (!query.team) return null;
    const record = records[query.team];
    return record && record.position === 'DEF' ? record : null;
  }

  const target = normalizePlayerName(query.name);
  let best: SleeperPlayerRecord | null = null;
  let bestScore: [number, number] | null = null;

  for (const record of Object.values(records)) {
    if (record.position !== query.position) continue;
    if (!record.full_name) continue;
    if (normalizePlayerName(record.full_name) !== target) continue;

    const teamMatches = query.team !== undefined && record.team === query.team;
    const rank = record.search_rank ?? Number.MAX_SAFE_INTEGER;
    const score: [number, number] = [teamMatches ? 0 : 1, rank];

    if (
      !bestScore ||
      score[0] < bestScore[0] ||
      (score[0] === bestScore[0] && score[1] < bestScore[1])
    ) {
      best = record;
      bestScore = score;
    }
  }

  return best;
}

function parseIntOrNull(value: string | null | undefined): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  return parseInt(value, 10);
}

// Sleeper's blob is inconsistent: most heights are pure inches ("72"), but
// a large minority (1,791 records as of writing) use feet-inches
// ("6'2\""). parseIntOrNull would silently misread the latter as just the
// feet digit, so height gets its own parser. A parsed height of 0 (or any
// other non-positive result) is treated as missing rather than a real bug.
function parseHeightIn(value: string | null | undefined): number | null {
  if (value == null) return null;

  if (/^\d+$/.test(value)) {
    const inches = parseInt(value, 10);
    return inches > 0 ? inches : null;
  }

  const feetInches = value.match(/^(\d)'(\d{1,2})"?$/);
  if (feetInches) {
    const total = parseInt(feetInches[1], 10) * 12 + parseInt(feetInches[2], 10);
    return total > 0 ? total : null;
  }

  return null;
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
    heightIn: parseHeightIn(record.height),
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

  // Sleeper's feed carries stray whitespace (e.g. titles with trailing
  // spaces, which break the icon-glue layout in the modal) — trim every
  // text field at this boundary and drop entries left without a title.
  const cleaned = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return items
    .map((item: any): PlayerNewsItem | null => {
      const title = cleaned(item?.metadata?.title);
      if (title === null || typeof item?.source !== 'string') {
        return null;
      }
      return {
        title,
        description: cleaned(item.metadata.description),
        analysis: cleaned(item.metadata.analysis),
        source: item.source,
        url: typeof item.metadata.url === 'string' ? item.metadata.url : null,
        published: typeof item.published === 'number' ? item.published : 0,
      };
    })
    .filter((item): item is PlayerNewsItem => item !== null)
    .sort((a, b) => b.published - a.published);
}

const SCHEDULE_URL_BASE = 'https://api.sleeper.app/schedule/nfl/regular';
const GRAPHQL_URL = 'https://sleeper.com/graphql';
const SCHEDULE_TTL_MS = 24 * 60 * 60 * 1000;
const NEWS_TTL_MS = 60 * 60 * 1000;
const SCHEDULE_TIMEOUT_MS = 10_000;
// news is a nice-to-have; fail fast rather than block the details response
const NEWS_TIMEOUT_MS = 4_000;

export async function getByeWeeks(
  season: number
): Promise<Record<string, number>> {
  return cached(`bye-weeks-${season}`, SCHEDULE_TTL_MS, async () => {
    // AbortSignal.timeout is supported at runtime (Node 18+) but isn't in
    // the DOM lib types bundled with this TS version.
    const response = await fetch(`${SCHEDULE_URL_BASE}/${season}`, {
      signal: (AbortSignal as any).timeout(SCHEDULE_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Sleeper schedule request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error('Unexpected Sleeper schedule payload');
    }

    return deriveByeWeeks(payload);
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
  if (!/^[A-Za-z0-9]{1,16}$/.test(playerId)) return [];

  try {
    return await cached(`player-news-${playerId}`, NEWS_TTL_MS, async () => {
      const query = `query get_player_news { get_player_news(sport: "nfl", player_id: "${playerId}", limit: 5) { metadata source published } }`;
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: (AbortSignal as any).timeout(NEWS_TIMEOUT_MS),
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
