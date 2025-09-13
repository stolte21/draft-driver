import type { NextApiRequest, NextApiResponse } from 'next';
import { formatsList, dataSourcesList, parseId } from 'utils';
import { fetchFantasyProsDataAdp, fetchFantasyProsRookies } from 'utils/scrape';
import { fetchBorisData } from 'utils/boris';
import { Format, DataSource, Player, Position, ScrapedRanking } from 'types';

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
  const player = playerMap.get(ranking.name);
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

  // when using boris data, we can calculate the vsAdp by comparing the rank to the fantasy pros rank
  // since the fantasy pros data we have is based on ADP
  const player = playerMap.get(ranking.name);
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
    /**
     * The fantasy pros rankings have each player's current team, while the Boris
     * data does not. We should fetch the fp data regardless so we can insert the team
     * for each player in case we want to use the Boris data as the source.
     */
    const fpAdp = await fetchFantasyProsDataAdp(format);
    const fpRookies = new Set(
      (await fetchFantasyProsRookies()).map((rookie) => rookie.name)
    );
    const rankingsToUse =
      dataSource === 'boris' ? await fetchBorisData(format) : fpAdp;
    const playerMap =
      dataSource === 'boris'
        ? new Map(fpAdp.map((ranking) => [ranking.name, ranking]))
        : new Map<string, (typeof rankingsToUse)[number]>();

    // the boris data doesn't include all the defenses and kickers, so we should add the rest
    // from the fantasy pros data
    if (dataSource === 'boris') {
      const nextHighestTier = rankingsToUse.reduce((acc, curr) => {
        if (curr.tier === undefined) return acc;
        if (curr.tier > acc) return curr.tier;
        return acc;
      }, 1);

      const defensesAndKickers = new Set(
        rankingsToUse
          //@ts-ignore
          .filter((ranking) => {
            return ranking.pos === 'DST' || ranking.pos === 'K';
          })
          //@ts-ignore
          .map((ranking) => ranking.name)
      );

      fpAdp
        .filter((ranking) => {
          return ranking.pos === 'DST' || ranking.pos === 'K';
        })
        .forEach((ranking) => {
          if (!defensesAndKickers.has(ranking.name)) {
            rankingsToUse.push({
              ...ranking,
              tier: nextHighestTier,
              //@ts-ignore
              rank: rankingsToUse.length + 1,
            });
          }
        });
    }

    rankingsToUse.forEach((ranking) => {
      players.push({
        id: parseId(ranking),
        name: ranking.name,
        position: ranking.pos as Position,
        team: parseTeam(ranking, playerMap),
        rank: ranking.rank,
        pRank: 0, // will be calculated after
        adp: playerMap.get(ranking.name)?.rank ?? 0,
        tier: ranking.tier,
        isRookie: fpRookies.has(ranking.name),
        vsAdp: parseVsAdp(dataSource, ranking, playerMap),
      });
    });
  } catch (error) {
    //@ts-ignore
    throw new Error(error);
  }

  calculatePositionalRankings(players);
  res.status(200).json(players);
}
