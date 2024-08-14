import { DataSource, Format, Position } from 'types';
export * from 'utils/boris';
export * from 'utils/scrape';
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
export const dataSourcesList: DataSource[] = ['fp', 'boris'];

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

export function getRankingsName(dataSource: DataSource) {
  switch (dataSource) {
    case 'boris':
      return 'Boris Chen';
    case 'fp':
      return 'Fantasy Pros';
  }
}
