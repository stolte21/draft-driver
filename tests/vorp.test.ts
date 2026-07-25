import { describe, it, expect } from 'vitest';
import {
  computeReplacementLevels,
  computeValueTiers,
  applyScarcityAdjustment,
} from 'utils/vorp';
import { Player, Position } from 'types';

let nextId = 0;
const makePlayer = (
  position: Position,
  projectedPoints: number | undefined,
  rank?: number
): Player => ({
  id: `p${nextId++}`,
  rank: rank ?? nextId,
  pRank: 0,
  adp: 0,
  name: `Player ${nextId}`,
  position,
  isRookie: false,
  projectedPoints,
});

/** n players at a position with points descending from `top` in steps of `step` */
const position = (pos: Position, n: number, top: number, step: number) =>
  Array.from({ length: n }, (_, i) => makePlayer(pos, top - i * step));

const baseRoster: Record<Position, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLX: 0,
  K: 1,
  DST: 1,
  BN: 0,
};

describe('computeReplacementLevels', () => {
  it('sets replacement to the last starter per position', () => {
    const players = [
      ...position('QB', 30, 400, 10), // QB1=400, QB2=390, ...
      ...position('RB', 60, 300, 5),
      ...position('WR', 60, 280, 4),
      ...position('TE', 30, 200, 6),
      ...position('K', 30, 150, 2),
      ...position('DST', 30, 140, 2),
    ];

    const levels = computeReplacementLevels(players, baseRoster, 10);

    // 1 QB × 10 teams → replacement is the 10th QB: 400 - 9×10 = 310
    expect(levels.QB).toBe(310);
    // 2 RB × 10 teams → 20th RB: 300 - 19×5 = 205
    expect(levels.RB).toBe(205);
  });

  it('moves the QB replacement level down in a 2QB league', () => {
    const players = [
      ...position('QB', 40, 400, 10),
      ...position('RB', 60, 300, 5),
      ...position('WR', 60, 280, 4),
      ...position('TE', 30, 200, 6),
      ...position('K', 30, 150, 2),
      ...position('DST', 30, 140, 2),
    ];

    const oneQb = computeReplacementLevels(players, baseRoster, 12);
    const twoQb = computeReplacementLevels(
      players,
      { ...baseRoster, QB: 2 },
      12
    );

    // 12th QB vs 24th QB
    expect(oneQb.QB).toBe(400 - 11 * 10);
    expect(twoQb.QB).toBe(400 - 23 * 10);
    expect(twoQb.QB).toBeLessThan(oneQb.QB!);
  });

  it('allocates flex slots to the position with the best next player', () => {
    const players = [
      ...position('RB', 10, 100, 10), // after 2 starters ea × 1 team: next RB = 80
      ...position('WR', 10, 95, 1), //  next WR = 93
      ...position('TE', 10, 50, 1),
    ];
    const roster: Record<Position, number> = {
      QB: 0,
      RB: 2,
      WR: 2,
      TE: 0,
      FLX: 1,
      K: 0,
      DST: 0,
      BN: 0,
    };

    // 1 team, 1 flex slot: WR3 (93) beats RB3 (80), so WR consumes the slot
    const levels = computeReplacementLevels(players, roster, 1);
    expect(levels.WR).toBe(93); // 3 WR starters → last is WR3
    expect(levels.RB).toBe(90); // still 2 RB starters → last is RB2
  });

  it('reallocates each flex slot against updated next players', () => {
    const players = [
      makePlayer('RB', 100),
      makePlayer('RB', 60),
      makePlayer('RB', 55),
      makePlayer('WR', 90),
      makePlayer('WR', 85),
      makePlayer('WR', 50),
    ];
    const roster: Record<Position, number> = {
      QB: 0,
      RB: 1,
      WR: 1,
      TE: 0,
      FLX: 2,
      K: 0,
      DST: 0,
      BN: 0,
    };

    // Slot 1: next WR (85) beats next RB (60) → WR gets 2 starters.
    // Slot 2: re-evaluated against the NEW next players — next RB (60)
    // now beats next WR (50) → RB gets 2 starters. A regression that
    // only computes the best flex position once (instead of per slot)
    // would give both slots to WR and fail this assertion.
    const levels = computeReplacementLevels(players, roster, 1);
    expect(levels.RB).toBe(60);
    expect(levels.WR).toBe(85);
  });

  it('uses the best player as replacement for zero-slot positions', () => {
    const players = [
      ...position('QB', 10, 400, 10),
      ...position('K', 10, 150, 2),
    ];
    const roster: Record<Position, number> = {
      QB: 1,
      RB: 0,
      WR: 0,
      TE: 0,
      FLX: 0,
      K: 0,
      DST: 0,
      BN: 0,
    };

    const levels = computeReplacementLevels(players, roster, 10);
    expect(levels.K).toBe(150); // best kicker → every kicker has value ≤ 0
  });

  it('clamps to the deepest available player when the pool is shallow', () => {
    const players = [...position('DST', 5, 140, 2)];
    const roster: Record<Position, number> = {
      QB: 0,
      RB: 0,
      WR: 0,
      TE: 0,
      FLX: 0,
      K: 0,
      DST: 1,
      BN: 0,
    };

    // 14 teams want 14 DSTs but only 5 exist → replacement is the 5th
    const levels = computeReplacementLevels(players, roster, 14);
    expect(levels.DST).toBe(140 - 4 * 2);
  });

  it('ignores players without projections', () => {
    const players = [
      makePlayer('QB', 400),
      makePlayer('QB', undefined),
      makePlayer('QB', 300),
    ];
    const roster: Record<Position, number> = {
      QB: 2,
      RB: 0,
      WR: 0,
      TE: 0,
      FLX: 0,
      K: 0,
      DST: 0,
      BN: 0,
    };

    const levels = computeReplacementLevels(players, roster, 1);
    expect(levels.QB).toBe(300); // 2nd projected QB, unprojected one skipped
  });

  it('omits positions with no projected players', () => {
    const players = [...position('QB', 5, 400, 10)];
    const levels = computeReplacementLevels(players, baseRoster, 10);
    expect(levels.RB).toBeUndefined();
  });
});

describe('computeValueTiers', () => {
  it('returns an empty array for no values', () => {
    expect(computeValueTiers([])).toEqual([]);
  });

  it('starts a new tier at large value gaps', () => {
    // gaps: 1,1,20,1 — with many small gaps the 20 clearly exceeds threshold
    const values = [100, 99, 98, 78, 77];
    const tiers = computeValueTiers(values);
    expect(tiers).toEqual([1, 1, 1, 2, 2]);
  });

  it('keeps one tier for a perfectly smooth distribution', () => {
    const values = Array.from({ length: 50 }, (_, i) => 100 - i);
    expect(new Set(computeValueTiers(values)).size).toBe(1);
  });

  it('is non-decreasing (tiers are contiguous)', () => {
    const values = [200, 150, 149, 100, 99, 98, 40];
    const tiers = computeValueTiers(values);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
    }
  });

  it('produces a sane tier count on a realistic distribution', () => {
    // ~200 players: steep elite top flattening into a long tail, with
    // occasional cliffs — the shape of a real VORP distribution
    const values = Array.from({ length: 200 }, (_, i) =>
      250 * Math.exp(-i / 40) + (i % 25 === 0 ? 20 : 0)
    ).sort((a, b) => b - a);

    const tierCount = new Set(computeValueTiers(values)).size;
    expect(tierCount).toBeGreaterThanOrEqual(4);
    expect(tierCount).toBeLessThanOrEqual(30);
  });
});

describe('applyScarcityAdjustment', () => {
  const roster: Record<Position, number> = {
    QB: 2,
    RB: 2,
    WR: 2,
    TE: 1,
    FLX: 0,
    K: 0,
    DST: 0,
    BN: 0,
  };

  it('re-orders by value over replacement, not raw points', () => {
    const players = [
      // QBs score more raw points but RB replacement is much lower here
      ...position('QB', 6, 320, 2), // flat position: little value spread
      ...position('RB', 6, 300, 40), // steep position: huge value spread
      ...position('WR', 6, 200, 10),
      ...position('TE', 6, 150, 10),
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 2);

    // RB1 value = 300 - 180 = 120; QB1 value = 320 - 314 = 6
    expect(adjusted[0].position).toBe('RB');
  });

  it('lifts QBs when roster demands two of them', () => {
    const players = [
      ...position('QB', 30, 400, 12), // steep QB decay
      ...position('RB', 50, 310, 5),
      ...position('WR', 50, 300, 4),
      ...position('TE', 20, 180, 8),
    ];
    const oneQbRoster = { ...roster, QB: 1 };

    const oneQb = applyScarcityAdjustment(players, oneQbRoster, 12);
    const twoQb = applyScarcityAdjustment(players, roster, 12);

    const qbsInTop24 = (list: Player[]) =>
      list.slice(0, 24).filter((p) => p.position === 'QB').length;

    expect(qbsInTop24(twoQb)).toBeGreaterThan(qbsInTop24(oneQb));
  });

  it('sends players without projections to the bottom in rank order', () => {
    const players = [
      makePlayer('QB', 300, 5),
      makePlayer('RB', undefined, 2),
      makePlayer('WR', undefined, 1),
      makePlayer('RB', 200, 4),
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 1);
    const tailRanks = adjusted.slice(-2).map((p) => p.rank);
    expect(tailRanks).toEqual([1, 2]); // unprojected players last, by rank
  });

  it('recomputes contiguous positional ranks in the new order', () => {
    const players = [
      makePlayer('QB', 250, 1), // source rank says this QB is first...
      makePlayer('QB', 300, 2), // ...but projections disagree
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 1);
    expect(adjusted[0].projectedPoints).toBe(300);
    expect(adjusted[0].pRank).toBe(1);
    expect(adjusted[1].pRank).toBe(2);
  });

  it('does not mutate the input players', () => {
    const players = [makePlayer('QB', 300, 1), makePlayer('QB', 250, 2)];
    const before = JSON.parse(JSON.stringify(players));
    applyScarcityAdjustment(players, roster, 1);
    expect(players).toEqual(before);
  });

  it('breaks value ties by original rank', () => {
    const players = [
      makePlayer('WR', 200, 9),
      makePlayer('WR', 200, 3),
    ];

    const adjusted = applyScarcityAdjustment(players, roster, 1);
    expect(adjusted[0].rank).toBe(3);
  });
});
