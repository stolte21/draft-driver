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
