import { Format, Position } from 'types';
export * from 'utils/storage';

export const formatsList: Format[] = ['standard', 'half-ppr', 'ppr'];
export const positionsList: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

/**
 * This prevents text from being selected after double clicking
 * but still allows the text to be click+drag highlighted.
 */
export const handlePreventDoubleClickHighlight: React.MouseEventHandler<
  HTMLDivElement
> = (e) => e.detail > 1 && e.preventDefault();
