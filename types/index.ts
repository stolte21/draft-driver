export type Format = 'standard' | 'ppr' | 'half-ppr';

export type Position = 'RB' | 'WR' | 'QB' | 'TE' | 'FLX' | 'K' | 'DST' | 'BN';
export type SpecialFilter = 'R' | 'FAV';

export type Player = {
  id: string;
  rank: number;
  pRank: number;
  adp: number;
  name: string;
  position: Position;
  isRookie: boolean;
  team?: string;
  tier?: number;
  vsAdp?: number;
  projectedPoints?: number;
};

export type RosteredPlayer = Player & {
  round: number;
  pick: number;
};

export type ScrapedRanking = {
  rank: number;
  name: string;
  pos: string;
  team?: string;
  tier?: number;
};

export type DepthChartPlayer = {
  id: string;
  name: string;
  pos: Position;
};

export type DepthChart = {
  team: string;
  players: DepthChartPlayer[];
};

export type ProjectedPlayer = {
  name: string;
  normalizedName: string;
  pos: Position;
  team?: string;
  points: Record<Format, number>;
  adp: Partial<Record<Format, number>>;
  isRookie: boolean;
};

export type PlayerNewsItem = {
  title: string;
  description: string | null;
  analysis: string | null;
  source: string;
  url: string | null;
  published: number; // epoch ms
};

export type PlayerDetails = {
  playerId: string;
  name: string;
  team: string | null;
  position: string;
  number: number | null;
  age: number | null;
  birthDate: string | null;
  heightIn: number | null;
  weightLb: number | null;
  college: string | null;
  yearsExp: number | null;
  rookieYear: number | null; // year drafted, from metadata.rookie_year
  status: string | null; // Active, Inactive, Injured Reserve, ...
  depthChartPosition: string | null;
  depthChartOrder: number | null;
  injury: {
    status: string;
    bodyPart: string | null;
    notes: string | null;
    startDate: string | null;
  } | null;
  byeWeek: number | null;
  photoUrl: string;
  news: PlayerNewsItem[];
};
