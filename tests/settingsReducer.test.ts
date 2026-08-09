import { describe, it, expect } from 'vitest';
import { settingsReducer, defaultState } from '../providers/settingsReducer';

describe('reset', () => {
  it('restores default settings and stays hydrated', () => {
    const dirtyState: typeof defaultState = {
      isHydrated: true,
      format: 'ppr',
      hidePlayerAfterDrafting: false,
      useScarcityAdjustment: true,
      rosterSize: {
        QB: 2,
        RB: 3,
        WR: 3,
        TE: 2,
        FLX: 2,
        DST: 0,
        K: 0,
        BN: 8,
      },
      numTeams: 14,
    };

    const result = settingsReducer(dirtyState, { type: 'reset' });

    expect(result).toEqual({ ...defaultState, isHydrated: true });
  });
});
