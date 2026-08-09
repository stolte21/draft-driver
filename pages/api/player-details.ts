import type { NextApiRequest, NextApiResponse } from 'next';
import { PlayerDetails } from 'types';
import {
  buildPlayerDetails,
  fetchPlayerNews,
  findSleeperPlayer,
  getByeWeeks,
} from 'utils/playerDetails';
import { getSleeperPlayers } from 'utils/sleeperPlayers';

const VALID_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DST']);

/**
 * NFL seasons span January/February of the following calendar year, so
 * early-year requests still belong to the prior season's schedule.
 */
function currentSeason(): number {
  const now = new Date();
  return now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerDetails | { error: string }>
) {
  const { name, position, team } = req.query;

  if (typeof name !== 'string' || name.length === 0 || name.length > 100) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof position !== 'string' || !VALID_POSITIONS.has(position)) {
    res
      .status(400)
      .json({ error: 'position must be one of QB/RB/WR/TE/K/DST' });
    return;
  }
  if (position === 'DST' && (typeof team !== 'string' || team.length === 0)) {
    res.status(400).json({ error: 'team is required for DST' });
    return;
  }

  let players;
  try {
    players = await getSleeperPlayers();
  } catch (error) {
    console.error('Failed to load Sleeper players', error);
    res.status(502).json({ error: 'Failed to load player data' });
    return;
  }

  try {
    const record = findSleeperPlayer(players, {
      name,
      position,
      team: typeof team === 'string' ? team : undefined,
    });

    if (!record) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // both enrichments are best-effort: bye week falls back to null and
    // news to [] (fetchPlayerNews never throws)
    const [byeWeeks, news] = await Promise.all([
      getByeWeeks(currentSeason()).catch(() => ({}) as Record<string, number>),
      fetchPlayerNews(record.player_id ?? ''),
    ]);

    // `?? null` is load-bearing here: without noUncheckedIndexedAccess TS
    // types byeWeeks[team] as number, but a missing team yields undefined
    // at runtime, which res.json would silently drop from the payload.
    const byeWeek = record.team ? byeWeeks[record.team] ?? null : null;

    res.status(200).json(buildPlayerDetails(record, byeWeek, news));
  } catch (error) {
    console.error('Failed to build player details', error);
    res.status(500).json({ error: 'Failed to build player details' });
  }
}
