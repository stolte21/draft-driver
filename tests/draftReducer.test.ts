import { describe, it, expect } from 'vitest';
import { draftReducer, State } from '../providers/draftReducer';

const baseState: State = {
  isHydrated: true,
  filter: '',
  rankings: [],
  draftedPlayers: [],
  roster: [],
  favorites: [],
  avoided: [],
  keepers: [],
};

describe('toggle-avoid', () => {
  it('adds a player to avoided', () => {
    const result = draftReducer(baseState, {
      type: 'toggle-avoid',
      payload: 'p1',
    });

    expect(result.avoided).toEqual(['p1']);
  });

  it('removes an already-avoided player', () => {
    const state = { ...baseState, avoided: ['p1', 'p2'] };
    const result = draftReducer(state, { type: 'toggle-avoid', payload: 'p1' });

    expect(result.avoided).toEqual(['p2']);
  });

  it('removes the player from favorites when avoiding', () => {
    const state = { ...baseState, favorites: ['p1', 'p2'] };
    const result = draftReducer(state, { type: 'toggle-avoid', payload: 'p1' });

    expect(result.avoided).toEqual(['p1']);
    expect(result.favorites).toEqual(['p2']);
  });
});

describe('toggle-favorite', () => {
  it('removes the player from avoided when favoriting', () => {
    const state = { ...baseState, avoided: ['p1', 'p2'] };
    const result = draftReducer(state, {
      type: 'toggle-favorite',
      payload: 'p1',
    });

    expect(result.favorites).toEqual(['p1']);
    expect(result.avoided).toEqual(['p2']);
  });
});

describe('hydrate', () => {
  it('falls back to an empty avoided list on legacy blobs', () => {
    const legacyBlob = { ...baseState } as Partial<State>;
    delete legacyBlob.avoided;

    const result = draftReducer(baseState, {
      type: 'hydrate',
      payload: legacyBlob as State,
    });

    expect(result.avoided).toEqual([]);
    expect(result.isHydrated).toBe(true);
  });
});
