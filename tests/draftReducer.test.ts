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
  notes: {},
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

describe('set-note', () => {
  it('adds a note for a player', () => {
    const result = draftReducer(baseState, {
      type: 'set-note',
      payload: { id: 'p1', note: 'great value in round 3' },
    });

    expect(result.notes).toEqual({ p1: 'great value in round 3' });
  });

  it('replaces an existing note', () => {
    const state = { ...baseState, notes: { p1: 'old note' } };
    const result = draftReducer(state, {
      type: 'set-note',
      payload: { id: 'p1', note: 'new note' },
    });

    expect(result.notes).toEqual({ p1: 'new note' });
  });

  it('deletes the note when set to an empty string', () => {
    const state = { ...baseState, notes: { p1: 'old note', p2: 'keep' } };
    const result = draftReducer(state, {
      type: 'set-note',
      payload: { id: 'p1', note: '' },
    });

    expect(result.notes).toEqual({ p2: 'keep' });
  });

  it('deletes the note when set to whitespace only', () => {
    const state = { ...baseState, notes: { p1: 'old note' } };
    const result = draftReducer(state, {
      type: 'set-note',
      payload: { id: 'p1', note: '   \n' },
    });

    expect(result.notes).toEqual({});
  });

  it('survives a draft reset', () => {
    const state = { ...baseState, notes: { p1: 'keep me' }, avoided: ['p2'] };
    const result = draftReducer(state, { type: 'reset' });

    expect(result.notes).toEqual({ p1: 'keep me' });
    expect(result.avoided).toEqual(['p2']);
  });

  it('stores the trimmed note', () => {
    const result = draftReducer(baseState, {
      type: 'set-note',
      payload: { id: 'p1', note: '  hi  ' },
    });

    expect(result.notes).toEqual({ p1: 'hi' });
  });
});

describe('hydrate notes', () => {
  it('falls back to an empty notes object on legacy blobs', () => {
    const legacyBlob = { ...baseState } as Partial<State>;
    delete legacyBlob.notes;

    const result = draftReducer(baseState, {
      type: 'hydrate',
      payload: legacyBlob as State,
    });

    expect(result.notes).toEqual({});
  });

  it('falls back to an empty notes object on malformed values', () => {
    const blob = { ...baseState, notes: ['not', 'an', 'object'] };

    const result = draftReducer(baseState, {
      type: 'hydrate',
      payload: blob as unknown as State,
    });

    expect(result.notes).toEqual({});
  });
});
