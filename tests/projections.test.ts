import { describe, it, expect } from 'vitest';
import {
  normalizePlayerName,
  parseProjection,
  attachProjections,
  buildAdpRankings,
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
  adp: {},
  isRookie: false,
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
      adp: {},
      isRookie: false,
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
    expect(parsed?.team).toBe('WAS');
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

  it('returns null for a position outside the sleeper allowlist, even with real stats', () => {
    expect(
      parseProjection({
        stats: { pts_std: 40, pts_ppr: 40, pts_half_ppr: 40 },
        player: { first_name: 'Some', last_name: 'LongSnapper', position: 'LS' },
        team: 'BUF',
      })
    ).toBeNull();
  });

  it('returns a ProjectedPlayer with all-zero points rather than null', () => {
    expect(
      parseProjection({
        stats: { pts_std: 0, pts_ppr: 0, pts_half_ppr: 0 },
        player: record.player,
        team: 'BUF',
      })
    ).toEqual({
      name: 'Josh Allen',
      normalizedName: 'josh allen',
      pos: 'QB',
      team: 'BUF',
      points: { standard: 0, ppr: 0, 'half-ppr': 0 },
      adp: {},
      isRookie: false,
    });
  });

  it('populates adp for formats with a real (< 900) adp value', () => {
    const parsed = parseProjection({
      stats: {
        pts_std: 300.1,
        pts_ppr: 310.5,
        pts_half_ppr: 305.3,
        adp_std: 30.6,
        adp_ppr: 28.2,
        adp_half_ppr: 24.2,
      },
      player: record.player,
      team: 'BUF',
    });

    expect(parsed?.adp).toEqual({
      standard: 30.6,
      ppr: 28.2,
      'half-ppr': 24.2,
    });
  });

  it('omits an adp format when the raw value is 999 (undrafted) or null', () => {
    const parsed = parseProjection({
      stats: {
        pts_std: 300.1,
        pts_ppr: 310.5,
        pts_half_ppr: 305.3,
        adp_std: 30.6,
        adp_ppr: 999,
        adp_half_ppr: null,
      },
      player: record.player,
      team: 'BUF',
    });

    expect(parsed?.adp).toEqual({ standard: 30.6 });
  });

  it('sets isRookie true when years_exp is 0', () => {
    const parsed = parseProjection({
      stats: record.stats,
      player: { ...record.player, years_exp: 0 },
      team: 'BUF',
    });

    expect(parsed?.isRookie).toBe(true);
  });

  it('carries injury status and body part onto the ProjectedPlayer', () => {
    const parsed = parseProjection({
      stats: record.stats,
      player: {
        ...record.player,
        injury_status: 'Questionable',
        injury_body_part: 'Back',
      },
      team: 'BUF',
    });

    expect(parsed?.injuryStatus).toBe('Questionable');
    expect(parsed?.injuryBodyPart).toBe('Back');
  });

  it('omits injury fields when they are null or missing', () => {
    const nullInjury = parseProjection({
      stats: record.stats,
      player: { ...record.player, injury_status: null, injury_body_part: null },
      team: 'BUF',
    });
    const missingInjury = parseProjection({
      stats: record.stats,
      player: record.player,
      team: 'BUF',
    });

    expect(nullInjury?.injuryStatus).toBeUndefined();
    expect(nullInjury?.injuryBodyPart).toBeUndefined();
    expect(missingInjury?.injuryStatus).toBeUndefined();
    expect(missingInjury?.injuryBodyPart).toBeUndefined();
  });

  it('sets isRookie false when years_exp is a positive number or missing', () => {
    const veteran = parseProjection({
      stats: record.stats,
      player: { ...record.player, years_exp: 3 },
      team: 'BUF',
    });
    const missingExp = parseProjection({
      stats: record.stats,
      player: record.player,
      team: 'BUF',
    });

    expect(veteran?.isRookie).toBe(false);
    expect(missingExp?.isRookie).toBe(false);
  });
});

describe('buildAdpRankings', () => {
  it('sorts ascending by the format adp and excludes players lacking that format adp', () => {
    const projections = [
      makeProjection({ name: 'B Player', normalizedName: 'b player', adp: { ppr: 20 } }),
      makeProjection({ name: 'A Player', normalizedName: 'a player', adp: { ppr: 5 } }),
      makeProjection({ name: 'No Adp', normalizedName: 'no adp', adp: {} }),
      makeProjection({ name: 'Standard Only', normalizedName: 'standard only', adp: { standard: 3 } }),
    ];

    const rankings = buildAdpRankings(projections, 'ppr');

    expect(rankings.map((r) => r.name)).toEqual(['A Player', 'B Player']);
  });

  it('assigns contiguous ranks starting at 1', () => {
    const projections = [
      makeProjection({ name: 'B Player', normalizedName: 'b player', adp: { ppr: 20 } }),
      makeProjection({ name: 'A Player', normalizedName: 'a player', adp: { ppr: 5 } }),
    ];

    const rankings = buildAdpRankings(projections, 'ppr');

    expect(rankings.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('maps team and pos onto the ranking', () => {
    const projections = [
      makeProjection({
        name: 'A Player',
        normalizedName: 'a player',
        pos: 'RB',
        team: 'BUF',
        adp: { ppr: 5 },
      }),
    ];

    const rankings = buildAdpRankings(projections, 'ppr');

    expect(rankings[0]).toEqual({ rank: 1, name: 'A Player', team: 'BUF', pos: 'RB' });
  });

  it('tie-breaks equal adp values by name', () => {
    const projections = [
      makeProjection({ name: 'Zeb Player', normalizedName: 'zeb player', adp: { ppr: 10 } }),
      makeProjection({ name: 'Alan Player', normalizedName: 'alan player', adp: { ppr: 10 } }),
    ];

    const rankings = buildAdpRankings(projections, 'ppr');

    expect(rankings.map((r) => r.name)).toEqual(['Alan Player', 'Zeb Player']);
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

  it('sets injury status and body part on a matched player', () => {
    const players = [makePlayer({ name: 'Jahmyr Gibbs', position: 'RB' })];
    const projections = [
      makeProjection({
        name: 'Jahmyr Gibbs',
        normalizedName: 'jahmyr gibbs',
        pos: 'RB',
        injuryStatus: 'Questionable',
        injuryBodyPart: 'Back',
      }),
    ];

    attachProjections(players, projections, 'ppr');
    expect(players[0].injuryStatus).toBe('Questionable');
    expect(players[0].injuryBodyPart).toBe('Back');
  });

  it('leaves injury fields undefined for a matched player without injury data', () => {
    const players = [makePlayer({ name: 'Healthy Guy', position: 'RB' })];
    const projections = [
      makeProjection({ name: 'Healthy Guy', normalizedName: 'healthy guy', pos: 'RB' }),
    ];

    attachProjections(players, projections, 'ppr');
    expect(players[0].injuryStatus).toBeUndefined();
    expect(players[0].injuryBodyPart).toBeUndefined();
  });

  it('sets injury status on matched DSTs via the team path', () => {
    const players = [
      makePlayer({ name: 'Baltimore Ravens', position: 'DST', team: 'BAL' }),
    ];
    const projections = [
      makeProjection({
        name: 'Baltimore',
        normalizedName: 'baltimore',
        pos: 'DST',
        team: 'BAL',
        injuryStatus: 'Out',
      }),
    ];

    attachProjections(players, projections, 'standard');
    expect(players[0].injuryStatus).toBe('Out');
  });

  it('sets projectedPoints to 0 for a matching player with zero projected points', () => {
    const players = [makePlayer({ name: 'Zero Guy', position: 'RB' })];
    const projections = [
      makeProjection({
        name: 'Zero Guy',
        normalizedName: 'zero guy',
        pos: 'RB',
        points: { standard: 0, ppr: 0, 'half-ppr': 0 },
      }),
    ];

    attachProjections(players, projections, 'ppr');
    expect(players[0].projectedPoints).toBe(0);
    expect(players[0].projectedPoints).not.toBeUndefined();
  });
});
