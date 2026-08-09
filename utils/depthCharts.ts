import { DepthChart, DepthChartPlayer, Position } from 'types';
import { parseId } from 'utils';

export const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
] as const;

const TEAM_SET = new Set<string>(NFL_TEAMS);

const DEPTH_CHART_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];
const POSITION_SET = new Set<string>(DEPTH_CHART_POSITIONS);

// The subset of a Sleeper players-endpoint record this module reads.
export type SleeperPlayerRecord = {
  active?: boolean | null;
  team?: string | null;
  position?: string | null;
  full_name?: string | null;
  depth_chart_order?: number | null;
};

export function buildDepthCharts(
  records: Record<string, SleeperPlayerRecord>
): DepthChart[] {
  type Entry = DepthChartPlayer & { order: number };
  const byTeam = new Map<string, Entry[]>();

  for (const record of Object.values(records)) {
    if (!record.active) continue;
    if (!record.team || !TEAM_SET.has(record.team)) continue;
    if (!record.position || !POSITION_SET.has(record.position)) continue;
    if (record.depth_chart_order == null) continue;
    if (!record.full_name) continue;

    const pos = record.position as Position;
    const entries = byTeam.get(record.team) ?? [];
    entries.push({
      id: parseId({ name: record.full_name, pos, rank: 0 }),
      name: record.full_name,
      pos,
      order: record.depth_chart_order,
    });
    byTeam.set(record.team, entries);
  }

  return Array.from(byTeam.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, entries]) => ({
      team,
      players: entries
        .sort(
          (a, b) =>
            DEPTH_CHART_POSITIONS.indexOf(a.pos) -
              DEPTH_CHART_POSITIONS.indexOf(b.pos) ||
            a.order - b.order ||
            a.name.localeCompare(b.name)
        )
        .map(({ order: _order, ...player }) => player),
    }));
}
