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
      draftPosition: 7,
    };

    const result = settingsReducer(dirtyState, { type: 'reset' });

    expect(result).toEqual({ ...defaultState, isHydrated: true });
  });
});

describe('set-draft-position', () => {
  it('sets the draft position', () => {
    const result = settingsReducer(
      { ...defaultState, isHydrated: true },
      { type: 'set-draft-position', payload: 5 }
    );

    expect(result.draftPosition).toBe(5);
  });

  it('clears the draft position with null', () => {
    const result = settingsReducer(
      { ...defaultState, isHydrated: true, draftPosition: 5 },
      { type: 'set-draft-position', payload: null }
    );

    expect(result.draftPosition).toBeNull();
  });
});

describe('hydrate draftPosition', () => {
  it('defaults legacy blobs without the key to null', () => {
    const blob = { ...defaultState } as Partial<typeof defaultState>;
    delete blob.draftPosition;

    const result = settingsReducer(defaultState, {
      type: 'hydrate',
      payload: blob as typeof defaultState,
    });

    expect(result.draftPosition).toBeNull();
  });

  it('coerces non-positive-integer values to null', () => {
    for (const bad of [0, -3, 2.5, NaN, 'x' as unknown as number]) {
      const result = settingsReducer(defaultState, {
        type: 'hydrate',
        payload: { ...defaultState, draftPosition: bad },
      });

      expect(result.draftPosition).toBeNull();
    }
  });

  it('keeps a valid stored value, even above numTeams', () => {
    // > numTeams is preserved (not clamped); consumers treat it as off
    const result = settingsReducer(defaultState, {
      type: 'hydrate',
      payload: { ...defaultState, numTeams: 10, draftPosition: 12 },
    });

    expect(result.draftPosition).toBe(12);
  });
});
