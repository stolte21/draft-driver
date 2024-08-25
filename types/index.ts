export type Format = 'standard' | 'ppr' | 'half-ppr';

export type Position = 'RB' | 'WR' | 'QB' | 'TE' | 'FLX' | 'K' | 'DST' | 'BN';
export type SpecialFilter = 'R' | 'FAV';

export type Player = {
  id: string;
  rank: number;
  name: string;
  position: Position;
  isRookie: boolean;
  team?: string;
  tier?: number;
  vsAdp?: number;
};

export type RosteredPlayer = Player & {
  round: number;
  pick: number;
};

export type DataSource = 'boris' | 'fp';

export type ScrapedRanking = {
  rank: number;
  name: string;
  pos: string;
  team?: string;
  tier?: number;
};
