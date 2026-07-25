import type { NextApiRequest, NextApiResponse } from 'next';
import { formatsList, dataSourcesList, parseId } from 'utils';
import { fetchBorisData } from 'utils/boris';
import {
  fetchProjections,
  attachProjections,
  buildAdpRankings,
  normalizePlayerName,
} from 'utils/projections';
import { TEAM_TO_ABRV_MAP } from 'utils/scrape';
import {
  Format,
  DataSource,
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

function validateDataSource(query: NextApiRequest['query']): DataSource {
  const { src } = query;

  if (!src) return 'boris';

  const parsedDataSource = src.toString();

  //@ts-ignore
  if (dataSourcesList.includes(parsedDataSource)) {
    return parsedDataSource as DataSource;
  } else {
    return 'fp';
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
  dataSource: DataSource,
  ranking: ScrapedRanking,
  playerMap: Map<string, ScrapedRanking>
) {
  if (dataSource === 'fp') return;

  // when using boris data, we can calculate the vsAdp by comparing the rank to the adp rank
  // since the adp data we have is based on ADP
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
  res: NextApiResponse<Player[]>
) {
  const format = validateFormat(req.query);
  const dataSource = validateDataSource(req.query);
  const players: Player[] = [];

  try {
    const [borisData, projections] = await Promise.all([
      dataSource === 'boris'
        ? fetchBorisData(format)
        : Promise.resolve<ScrapedRanking[]>([]),
      // projections are an enhancement — rankings must still work without them
      fetchProjections().catch((error): ProjectedPlayer[] => {
        console.error('Failed to fetch projections:', error);
        return [];
      }),
    ]);

    // the adp rankings (derived from sleeper projections) double as the "fp"
    // data source and as the source of team/rookie info when using boris data
    const adpRankings = buildAdpRankings(projections, format);

    const rankingsToUse: ScrapedRanking[] =
      dataSource === 'boris' ? borisData : adpRankings;

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
    if (dataSource === 'boris') {
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
    }

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
        vsAdp: parseVsAdp(dataSource, ranking, playerMap),
      });
    });

    attachProjections(players, projections, format);
  } catch (error) {
    //@ts-ignore
    throw new Error(error);
  }

  calculatePositionalRankings(players);
  res.status(200).json(players);
}
