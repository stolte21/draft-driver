import { describe, it, expect } from 'vitest';
import {
  normalizePlayerName,
  parseProjection,
  attachProjections,
} from 'utils/projections';
import { Player, ProjectedPlayer } from 'types';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: 'x',
  rank: 1,
  pRank: 1,
  adp: 1,
  name: 'X',
  position: 'QB',
  isRookie: false,
  ...overrides,
});

const makeProjection = (
  overrides: Partial<ProjectedPlayer>
): ProjectedPlayer => ({
  name: 'X',
  normalizedName: 'x',
  pos: 'QB',
  points: { standard: 100, ppr: 110, 'half-ppr': 105 },
  ...overrides,
});

describe('normalizePlayerName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizePlayerName("Ja'Marr Chase")).toBe('jamarr chase');
    expect(normalizePlayerName('A.J. Brown')).toBe('aj brown');
  });

  it('strips generational suffixes', () => {
    expect(normalizePlayerName('Marvin Harrison Jr.')).toBe('marvin harrison');
    expect(normalizePlayerName('Patrick Mahomes II')).toBe('patrick mahomes');
    expect(normalizePlayerName('Will Fuller V')).toBe('will fuller');
  });

  it('leaves ordinary names alone', () => {
    expect(normalizePlayerName('Josh Allen')).toBe('josh allen');
  });
});

describe('parseProjection', () => {
  const record = {
    stats: { pts_std: 300.1, pts_ppr: 310.5, pts_half_ppr: 305.3 },
    player: { first_name: 'Josh', last_name: 'Allen', position: 'QB' },
    team: 'BUF',
  };

  it('maps a sleeper record to a ProjectedPlayer', () => {
    expect(parseProjection(record)).toEqual({
      name: 'Josh Allen',
      normalizedName: 'josh allen',
      pos: 'QB',
      team: 'BUF',
      points: { standard: 300.1, ppr: 310.5, 'half-ppr': 305.3 },
    });
  });

  it('maps DEF position to DST and aliases the team abbreviation', () => {
    const def = {
      stats: { pts_std: 120, pts_ppr: 120, pts_half_ppr: 120 },
      player: { first_name: 'Washington', last_name: 'Commanders', position: 'DEF' },
      team: 'WAS',
    };
    const parsed = parseProjection(def);
    expect(parsed?.pos).toBe('DST');
    expect(parsed?.team).toBe('WSH');
  });

  it('returns null for records without stats or player', () => {
    expect(parseProjection({ stats: null, player: record.player, team: 'BUF' })).toBeNull();
    expect(parseProjection({ stats: record.stats, player: null, team: 'BUF' })).toBeNull();
  });

  it('returns null when every format is missing points', () => {
    expect(
      parseProjection({
        stats: { pts_std: null, pts_ppr: null, pts_half_ppr: null },
        player: record.player,
        team: 'BUF',
      })
    ).toBeNull();
  });
});

describe('attachProjections', () => {
  it('attaches points for the requested format by normalized name + position', () => {
    const players = [makePlayer({ name: 'Marvin Harrison Jr.', position: 'WR' })];
    const projections = [
      makeProjection({
        name: 'Marvin Harrison',
        normalizedName: 'marvin harrison',
        pos: 'WR',
        points: { standard: 200, ppr: 250, 'half-ppr': 225 },
      }),
    ];

    attachProjections(players, projections, 'half-ppr');
    expect(players[0].projectedPoints).toBe(225);
  });

  it('does not match the same name at a different position', () => {
    const players = [makePlayer({ name: 'Taysom Hill', position: 'TE' })];
    const projections = [
      makeProjection({ name: 'Taysom Hill', normalizedName: 'taysom hill', pos: 'QB' }),
    ];

    attachProjections(players, projections, 'ppr');
    expect(players[0].projectedPoints).toBeUndefined();
  });

  it('matches DSTs by team abbreviation, not name', () => {
    const players = [
      makePlayer({ name: 'Baltimore Ravens', position: 'DST', team: 'BAL' }),
    ];
    const projections = [
      makeProjection({
        name: 'Baltimore',
        normalizedName: 'baltimore',
        pos: 'DST',
        team: 'BAL',
        points: { standard: 130, ppr: 130, 'half-ppr': 130 },
      }),
    ];

    attachProjections(players, projections, 'standard');
    expect(players[0].projectedPoints).toBe(130);
  });

  it('leaves unmatched players untouched', () => {
    const players = [makePlayer({ name: 'Unknown Guy', position: 'RB' })];
    attachProjections(players, [], 'ppr');
    expect(players[0].projectedPoints).toBeUndefined();
  });
});
