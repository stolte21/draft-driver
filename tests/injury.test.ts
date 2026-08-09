import { describe, it, expect } from 'vitest';
import { getInjuryIndicator, formatInjuryDetail } from 'utils/injury';

describe('getInjuryIndicator', () => {
  it('abbreviates Questionable to a non-severe Q', () => {
    expect(getInjuryIndicator('Questionable')).toEqual({
      label: 'Q',
      severe: false,
    });
  });

  it('abbreviates Doubtful and Out to severe single letters', () => {
    expect(getInjuryIndicator('Doubtful')).toEqual({ label: 'D', severe: true });
    expect(getInjuryIndicator('Out')).toEqual({ label: 'O', severe: true });
  });

  it('renders roster designations as severe short uppercase labels', () => {
    expect(getInjuryIndicator('IR')).toEqual({ label: 'IR', severe: true });
    expect(getInjuryIndicator('PUP')).toEqual({ label: 'PUP', severe: true });
    expect(getInjuryIndicator('Sus')).toEqual({ label: 'SUS', severe: true });
    expect(getInjuryIndicator('NFI')).toEqual({ label: 'NFI', severe: true });
    expect(getInjuryIndicator('COV')).toEqual({ label: 'COV', severe: true });
    expect(getInjuryIndicator('DNR')).toEqual({ label: 'DNR', severe: true });
  });

  it('matches statuses case-insensitively', () => {
    expect(getInjuryIndicator('QUESTIONABLE')).toEqual({
      label: 'Q',
      severe: false,
    });
    expect(getInjuryIndicator('out')).toEqual({ label: 'O', severe: true });
  });

  it('falls back to a severe uppercase label for unknown statuses', () => {
    expect(getInjuryIndicator('XYZ')).toEqual({ label: 'XYZ', severe: true });
  });

  it('returns null for missing or blank statuses', () => {
    expect(getInjuryIndicator(undefined)).toBeNull();
    expect(getInjuryIndicator('')).toBeNull();
    expect(getInjuryIndicator('   ')).toBeNull();
  });
});

describe('formatInjuryDetail', () => {
  it('joins status and body part with an em dash', () => {
    expect(formatInjuryDetail('Questionable', 'Back')).toBe(
      'Questionable — Back'
    );
  });

  it('returns the status alone when there is no body part', () => {
    expect(formatInjuryDetail('Out', undefined)).toBe('Out');
  });
});
