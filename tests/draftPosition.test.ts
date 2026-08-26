import { describe, it, expect } from 'vitest';
import { getPickInfo, isUsersPick } from '../utils/draftPosition';

describe('getPickInfo', () => {
  it('maps overall picks in round 1', () => {
    expect(getPickInfo(1, 10)).toEqual({ round: 1, pickInRound: 1 });
    expect(getPickInfo(10, 10)).toEqual({ round: 1, pickInRound: 10 });
  });

  it('maps overall picks in later rounds', () => {
    expect(getPickInfo(11, 10)).toEqual({ round: 2, pickInRound: 1 });
    expect(getPickInfo(25, 12)).toEqual({ round: 3, pickInRound: 1 });
  });
});

describe('isUsersPick', () => {
  it('matches the draft position in odd rounds', () => {
    // 10 teams, slot 3: round 1 pick 3 = overall 3
    expect(isUsersPick(3, 10, 3)).toBe(true);
    // round 3 pick 3 = overall 23
    expect(isUsersPick(23, 10, 3)).toBe(true);
    expect(isUsersPick(4, 10, 3)).toBe(false);
  });

  it('reverses the slot in even rounds (snake)', () => {
    // 10 teams, slot 3: round 2 slot = 10 - 3 + 1 = 8 -> overall 18
    expect(isUsersPick(18, 10, 3)).toBe(true);
    expect(isUsersPick(13, 10, 3)).toBe(false);
  });

  it('handles the turn for the last slot', () => {
    // 10 teams, slot 10: back-to-back picks at overall 10 and 11
    expect(isUsersPick(10, 10, 10)).toBe(true);
    expect(isUsersPick(11, 10, 10)).toBe(true);
    expect(isUsersPick(12, 10, 10)).toBe(false);
  });

  it('handles slot 1', () => {
    expect(isUsersPick(1, 10, 1)).toBe(true);
    // round 2 slot for position 1 is pick 10 -> overall 20
    expect(isUsersPick(20, 10, 1)).toBe(true);
  });

  it('returns false for unset or invalid positions', () => {
    expect(isUsersPick(1, 10, null)).toBe(false);
    expect(isUsersPick(1, 10, 0)).toBe(false);
    expect(isUsersPick(1, 10, 11)).toBe(false); // > numTeams: treated as off
    expect(isUsersPick(1, 10, 2.5)).toBe(false);
  });
});
