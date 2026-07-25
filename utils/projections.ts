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
