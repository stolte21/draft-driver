export type Format = 'standard' | 'ppr' | 'half-ppr';

export type Position = 'RB' | 'WR' | 'QB' | 'TE' | 'FLX' | 'K' | 'DST' | 'BN';

export type Player = {
  id: string;
  rank: number;
  name: string;
  position: Position;
  team?: string;
  tier?: number;
  isRookie?: boolean;
};

export type RosteredPlayer = Player & {
  round: number;
  pick: number;
};

export type DataSource = 'boris' | 'fp';
