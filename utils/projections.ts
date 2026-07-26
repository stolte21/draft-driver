import {
  Format,
  Player,
  Position,
  ProjectedPlayer,
  ScrapedRanking,
} from 'types';
import { cached } from 'utils/cache';

const SLEEPER_BASE_URL = 'https://api.sleeper.com/projections/nfl';
const SLEEPER_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const PROJECTIONS_TTL_MS = 24 * 60 * 60 * 1000;
const SLEEPER_TIMEOUT_MS = 10_000;

// Sleeper's position[] query filter is not fully reliable and can leak
// records for other positions (e.g. a TE showing up in the QB query), so
// every record's position is validated against this allowlist before it's
// trusted.
const VALID_SLEEPER_POSITIONS = new Set([
  'QB',
  'RB',
  'WR',
  'TE',
  'K',
  'DEF',
]);

// sleeper team abbreviations that differ from the ones this app uses
const SLEEPER_TEAM_ALIASES: Record<string, string> = {
  WAS: 'WSH',
};

export type SleeperProjection = {
  stats: {
    pts_std?: number | null;
    pts_ppr?: number | null;
    pts_half_ppr?: number | null;
    adp_std?: number | null;
    adp_ppr?: number | null;
    adp_half_ppr?: number | null;
  } | null;
  player: {
    first_name: string;
    last_name: string;
    position: string;
    years_exp?: number | null;
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

// Sleeper uses 999 to signal "undrafted" for a format's adp instead of
// omitting the field, so anything at or above that threshold (as well as
// null/missing values) is treated as "no adp for this format".
function parseAdp(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || value >= 900) return undefined;
  return value;
}

export function parseProjection(
  record: SleeperProjection
): ProjectedPlayer | null {
  if (!record.player || !record.stats) return null;
  if (!VALID_SLEEPER_POSITIONS.has(record.player.position)) return null;

  const {
    pts_std,
    pts_ppr,
    pts_half_ppr,
    adp_std,
    adp_ppr,
    adp_half_ppr,
  } = record.stats;
  if (pts_std == null && pts_ppr == null && pts_half_ppr == null) return null;

  const name = `${record.player.first_name} ${record.player.last_name}`;
  const pos =
    record.player.position === 'DEF'
      ? 'DST'
      : (record.player.position as Position);
  const team = record.team
    ? SLEEPER_TEAM_ALIASES[record.team] ?? record.team
    : undefined;

  const adp: Partial<Record<Format, number>> = {};
  const standardAdp = parseAdp(adp_std);
  if (standardAdp !== undefined) adp.standard = standardAdp;
  const pprAdp = parseAdp(adp_ppr);
  if (pprAdp !== undefined) adp.ppr = pprAdp;
  const halfPprAdp = parseAdp(adp_half_ppr);
  if (halfPprAdp !== undefined) adp['half-ppr'] = halfPprAdp;

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
    adp,
    isRookie: record.player.years_exp === 0,
  };
}

async function fetchPositionProjections(
  year: number,
  position: string
): Promise<SleeperProjection[]> {
  const url = `${SLEEPER_BASE_URL}/${year}?season_type=regular&position%5B%5D=${position}&order_by=pts_half_ppr`;
  // AbortSignal.timeout is supported at runtime (Node 18+, this repo runs
  // Node 25) but isn't in the DOM lib types bundled with this TS version.
  const response = await fetch(url, {
    signal: (AbortSignal as any).timeout(SLEEPER_TIMEOUT_MS),
  });

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

/**
 * Build an ADP-ordered ranking list (the "fp" data source) from projections.
 * Players without an ADP for the format are excluded (undrafted).
 */
export function buildAdpRankings(
  projections: ProjectedPlayer[],
  format: Format
): ScrapedRanking[] {
  return projections
    .filter((proj) => proj.adp[format] !== undefined)
    .sort((a, b) => {
      const diff = a.adp[format]! - b.adp[format]!;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    })
    .map((proj, index) => ({
      rank: index + 1,
      name: proj.name,
      team: proj.team,
      pos: proj.pos,
    }));
}
