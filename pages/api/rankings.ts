import type { NextApiRequest, NextApiResponse } from 'next';
import {
  formatsList,
  dataSourcesList,
  fetchFantasyProsData,
  fetchBorisData,
  fetchFantasyProsRookies,
} from 'utils';
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

function parseId(ranking: ScrapedRanking) {
  return `${ranking.name.toLowerCase().replaceAll(' ', '_')}_${ranking.pos}`;
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
    const fpRankings = await fetchFantasyProsData(format);
    const fpRookies = new Set(
      (await fetchFantasyProsRookies()).map((rookie) => rookie.name)
    );
    const rankingsToUse =
      dataSource === 'boris' ? await fetchBorisData(format) : fpRankings;
    const playerMap =
      dataSource === 'boris'
        ? new Map(fpRankings.map((ranking) => [ranking.name, ranking]))
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

      fpRankings
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
        tier: ranking.tier,
        isRookie: fpRookies.has(ranking.name),
        vsAdp: parseVsAdp(dataSource, ranking, playerMap),
      });
    });
  } catch (error) {
    //@ts-ignore
    throw new Error(error);
  }

  res.status(200).json(players);
}
