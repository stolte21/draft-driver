export type Format = 'standard' | 'ppr' | 'half-ppr';

export type Position = 'RB' | 'WR' | 'QB' | 'TE' | 'K' | 'DEF';

export type Player = {
  id: number;
  name: string;
  position: Position;
  team: string;
};
