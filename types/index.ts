export type Format = 'standard' | 'ppr' | 'half-ppr';

export type Position = 'RB' | 'WR' | 'QB' | 'TE' | 'K' | 'DST';

export type Player = {
  id: string;
  rank: number;
  name: string;
  position: Position;
  team?: string;
  tier?: number;
};

export type DataSource = 'boris' | 'fp';
