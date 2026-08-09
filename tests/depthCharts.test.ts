import { describe, expect, it } from 'vitest';
import { buildDepthCharts, SleeperPlayerRecord } from 'utils/depthCharts';

let nextId = 0;
function record(
  overrides: Partial<SleeperPlayerRecord>
): [string, SleeperPlayerRecord] {
  return [
    `${++nextId}`,
    {
      active: true,
      team: 'WAS',
      position: 'RB',
      full_name: 'Test Player',
      depth_chart_order: 1,
      ...overrides,
    },
  ];
}

function build(...records: [string, SleeperPlayerRecord][]) {
  return buildDepthCharts(Object.fromEntries(records));
}

describe('buildDepthCharts', () => {
  it('groups players by team, ordered QB→RB→WR→TE then depth order', () => {
    const charts = build(
      record({ full_name: 'RB Two', position: 'RB', depth_chart_order: 2 }),
      record({ full_name: 'QB One', position: 'QB', depth_chart_order: 1 }),
      record({ full_name: 'RB One', position: 'RB', depth_chart_order: 1 }),
      record({ full_name: 'WR One', position: 'WR', depth_chart_order: 1 }),
      record({ full_name: 'TE One', position: 'TE', depth_chart_order: 1 })
    );

    expect(charts).toHaveLength(1);
    expect(charts[0].team).toBe('WAS');
    expect(charts[0].players.map((p) => p.name)).toEqual([
      'QB One',
      'RB One',
      'RB Two',
      'WR One',
      'TE One',
    ]);
  });

  it('generates ids compatible with the rankings player map', () => {
    const charts = build(
      record({ full_name: 'Jayden Daniels', position: 'QB' })
    );

    expect(charts[0].players[0]).toEqual({
      id: 'jayden_daniels_QB',
      name: 'Jayden Daniels',
      pos: 'QB',
    });
  });

  it('skips inactive players, legacy teams, missing depth order, and non-skill positions', () => {
    const charts = build(
      record({ full_name: 'Retired Guy', active: false }),
      record({ full_name: 'Raider Ghost', team: 'OAK' }),
      record({ full_name: 'Free Agent', team: null }),
      record({ full_name: 'Practice Squad', depth_chart_order: null }),
      record({ full_name: 'A Kicker', position: 'K' }),
      record({ full_name: null }),
      record({ full_name: 'Keeper', position: 'WR' })
    );

    expect(charts).toHaveLength(1);
    expect(charts[0].players.map((p) => p.name)).toEqual(['Keeper']);
  });

  it('sorts teams alphabetically by abbreviation', () => {
    const charts = build(
      record({ team: 'WAS' }),
      record({ team: 'ARI' }),
      record({ team: 'KC' })
    );

    expect(charts.map((c) => c.team)).toEqual(['ARI', 'KC', 'WAS']);
  });
});
