import type { NextApiRequest, NextApiResponse } from 'next';
import { formatsList, parseId } from 'utils';
import { fetchBorisData } from 'utils/boris';
import {
  fetchProjections,
  attachProjections,
  buildAdpRankings,
  normalizePlayerName,
} from 'utils/projections';
import { attachInjuryStatuses } from 'utils/playerDetails';
import {
  getSleeperPlayers,
  SleeperPlayerRecord,
} from 'utils/sleeperPlayers';
import { TEAM_TO_ABRV_MAP } from 'utils/teams';
import {
  Format,
  Player,
  Position,
  ScrapedRanking,
  ProjectedPlayer,
} from 'types';

function validateFormat(query: NextApiRequest['query']): Format {
  const { format } = query;

  if (!format) return 'ppr';

  const parsedFormat = format.toString();

  //@ts-ignore
  if (formatsList.includes(parsedFormat)) {
    return parsedFormat as Format;
  } else {
    return 'ppr';
  }
}

function parseTeam(
  ranking: ScrapedRanking,
  playerMap: Map<string, ScrapedRanking>
) {
  const player = playerMap.get(normalizePlayerName(ranking.name));
  if (player) {
    return player.team;
  }
}

function parseVsAdp(
  ranking: ScrapedRanking,
  playerMap: Map<string, ScrapedRanking>
) {
  // vsAdp compares the boris rank to the sleeper-derived adp rank
  const player = playerMap.get(normalizePlayerName(ranking.name));
  if (player) {
    return player.rank - ranking.rank;
  }
}

/**
 * Causes a side effect of updating the pRank property on each player
 * in the players array.
 */
function calculatePositionalRankings(players: Player[]) {
  const positionCounts: Partial<Record<Position, number>> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DST: 0,
    K: 0,
  };

  const sortedPlayers = [...players].sort((a, b) => a.rank - b.rank);

  sortedPlayers.forEach((player) => {
    if (positionCounts[player.position] !== undefined) {
      positionCounts[player.position]! += 1;
      player.pRank = positionCounts[player.position]!;
    }
  });

  return positionCounts;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Player[] | { error: string }>
) {
  const format = validateFormat(req.query);
  const players: Player[] = [];

  let borisLastModified: string | undefined;

  try {
    const [borisData, projections, sleeperPlayers] = await Promise.all([
      fetchBorisData(format),
      // projections are an enhancement — rankings must still work without them
      fetchProjections().catch((error): ProjectedPlayer[] => {
        console.error('Failed to fetch projections:', error);
        return [];
      }),
      // injury statuses come from the players blob (the same source the
      // details modal reads); degrade to the projections-embedded statuses
      getSleeperPlayers().catch(
        (error): Record<string, SleeperPlayerRecord> | null => {
          console.error('Failed to fetch Sleeper players:', error);
          return null;
        }
      ),
    ]);

    borisLastModified = borisData.lastModified;

    // the adp rankings (derived from sleeper projections) provide team/adp/
    // rookie info that gets merged into the boris rankings
    const adpRankings = buildAdpRankings(projections, format);

    const rankingsToUse: ScrapedRanking[] = borisData.rankings;

    // Keyed by normalized name only (no position), which is a deliberate
    // tradeoff: name-only keys can collide across positions (last write
    // wins), but normalizing materially improves the match rate between
    // sleeper (adp) and boris names. isRookie below uses a name|pos key
    // instead, since that lookup needs to stay position-specific.
    const playerMap = new Map(
      adpRankings.map((ranking) => [
        normalizePlayerName(ranking.name),
        ranking,
      ])
    );

    const projectionsByNormalizedName = new Map<string, ProjectedPlayer>();
    const projectionsByNameAndPos = new Map<string, ProjectedPlayer>();
    projections.forEach((proj) => {
      projectionsByNormalizedName.set(proj.normalizedName, proj);
      projectionsByNameAndPos.set(`${proj.normalizedName}|${proj.pos}`, proj);
    });

    // the boris data doesn't include all the defenses and kickers, so we should add the rest
    // from the projections data
    const nextHighestTier = rankingsToUse.reduce((acc, curr) => {
      if (curr.tier === undefined) return acc;
      if (curr.tier > acc) return curr.tier;
      return acc;
    }, 1);

    const defensesAndKickers = new Set(
      rankingsToUse
        .filter((ranking) => {
          return ranking.pos === 'DST' || ranking.pos === 'K';
        })
        .map((ranking) => ranking.name)
    );

    const dstAndKProjections = projections
      .filter((proj) => proj.pos === 'DST' || proj.pos === 'K')
      .sort((a, b) => b.points[format] - a.points[format]);

    dstAndKProjections.forEach((proj) => {
      if (!defensesAndKickers.has(proj.name)) {
        rankingsToUse.push({
          name: proj.name,
          pos: proj.pos,
          tier: nextHighestTier,
          rank: rankingsToUse.length + 1,
        });
      }
    });

    rankingsToUse.forEach((ranking) => {
      let team = parseTeam(ranking, playerMap);
      if (!team) {
        if (ranking.pos === 'DST') {
          team =
            TEAM_TO_ABRV_MAP[ranking.name as keyof typeof TEAM_TO_ABRV_MAP];
        } else {
          team = projectionsByNormalizedName.get(
            normalizePlayerName(ranking.name)
          )?.team;
        }
      }

      const isRookie =
        projectionsByNameAndPos.get(
          `${normalizePlayerName(ranking.name)}|${ranking.pos}`
        )?.isRookie ?? false;

      players.push({
        id: parseId(ranking),
        name: ranking.name,
        position: ranking.pos as Position,
        team,
        rank: ranking.rank,
        pRank: 0, // will be calculated after
        adp: playerMap.get(normalizePlayerName(ranking.name))?.rank ?? 0,
        tier: ranking.tier,
        isRookie,
        vsAdp: parseVsAdp(ranking, playerMap),
      });
    });

    attachProjections(players, projections, format);
    if (sleeperPlayers) attachInjuryStatuses(players, sleeperPlayers);
  } catch (error) {
    console.error('Failed to load rankings', error);
    res.status(502).json({ error: 'Failed to load rankings' });
    return;
  }

  calculatePositionalRankings(players);

  if (borisLastModified) {
    res.setHeader('x-rankings-last-modified', borisLastModified);
  }

  res.status(200).json(players);
}
