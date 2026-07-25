import { describe, it, expect } from 'vitest';
import { parseId } from 'utils';

describe('vitest setup', () => {
  it('resolves baseUrl imports', () => {
    expect(parseId({ rank: 1, name: 'Josh Allen', pos: 'QB' })).toBe(
      'josh_allen_QB'
    );
  });
});
