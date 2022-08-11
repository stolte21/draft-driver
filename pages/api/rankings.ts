import type { NextApiRequest, NextApiResponse } from 'next';
import { formatsList, scrapeFantasyPros } from 'utils';
import { Format, Player, Position } from 'types';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Player[]>
) {
  const format = validateFormat(req.query);
  const players: Player[] = [];

  try {
    const rankings = await scrapeFantasyPros(format);
    rankings.forEach((ranking) =>
      players.push({
        id: (ranking.team || 'FA') + '_' + ranking.name,
        name: ranking.name,
        position: ranking.pos as Position,
        team: ranking.team,
        rank: ranking.rank,
      })
    );
  } catch (error) {
    //@ts-ignore
    throw new Error(error);
  }

  res.status(200).json(players);
}
