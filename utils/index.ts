import { Format, Position, SpecialFilter, ScrapedRanking } from 'types';
export * from 'utils/storage';

export const formatsList: Format[] = ['standard', 'half-ppr', 'ppr'];
export const positionsList: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
export const positionsForFantasyList: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'FLX',
  'K',
  'DST',
  'BN',
];
// TODO: have this configurable via settings
export const flexPositionsList: Position[] = ['WR', 'RB', 'TE'];

export const STALE_RANKINGS_DAYS = 45;

/**
 * Rankings are considered stale when their last-modified date is more than
 * STALE_RANKINGS_DAYS before `now`. Unknown dates are not considered stale.
 */
export function areRankingsStale(
  lastModified: string | undefined,
  now: Date
): boolean {
  if (!lastModified) return false;

  const parsed = new Date(lastModified);
  if (Number.isNaN(parsed.getTime())) return false;

  const staleThresholdMs = STALE_RANKINGS_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - parsed.getTime() > staleThresholdMs;
}

/**
 * This prevents text from being selected after double clicking
 * but still allows the text to be click+drag highlighted.
 */
export const handlePreventDoubleClickHighlight: React.MouseEventHandler<
  HTMLDivElement
> = (e) => e.detail > 1 && e.preventDefault();

export function getFormatName(format: Format) {
  switch (format) {
    case 'standard':
      return 'Standard';
    case 'half-ppr':
      return 'Half PPR';
    case 'ppr':
      return 'PPR';
  }
}

export function hasOnlySpecialFilters(filters: Set<Position | SpecialFilter>) {
  return Array.from(filters.values()).every(
    (value) => value === 'R' || value === 'FAV'
  );
}

export function parseId(ranking: ScrapedRanking) {
  return `${ranking.name.toLowerCase().replaceAll(' ', '_')}_${ranking.pos}`;
}
