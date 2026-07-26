import { describe, it, expect } from 'vitest';
import { areRankingsStale, STALE_RANKINGS_DAYS } from 'utils';

const NOW = new Date('2026-07-26T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const daysBefore = (now: Date, days: number) =>
  new Date(now.getTime() - days * DAY_MS);

describe('areRankingsStale', () => {
  it('returns true for a year-old date', () => {
    const lastModified = new Date(
      NOW.getTime() - 365 * DAY_MS
    ).toUTCString();

    expect(areRankingsStale(lastModified, NOW)).toBe(true);
  });

  it('returns false for a date 5 days old', () => {
    const lastModified = daysBefore(NOW, 5).toUTCString();

    expect(areRankingsStale(lastModified, NOW)).toBe(false);
  });

  it('returns false at exactly the boundary (45 days)', () => {
    const lastModified = daysBefore(NOW, STALE_RANKINGS_DAYS).toUTCString();

    expect(areRankingsStale(lastModified, NOW)).toBe(false);
  });

  it('returns true just past the boundary (46 days)', () => {
    const lastModified = daysBefore(
      NOW,
      STALE_RANKINGS_DAYS + 1
    ).toUTCString();

    expect(areRankingsStale(lastModified, NOW)).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(areRankingsStale(undefined, NOW)).toBe(false);
  });

  it('returns false for an unparseable date string', () => {
    expect(areRankingsStale('not a date', NOW)).toBe(false);
  });
});
