import { parse } from 'csv-parse/sync';
import { Format, ScrapedRanking } from 'types';

type BorisPlayer = {
  Rank: string;
  'Player.Name': string;
  Tier: string;
  Position: string;
};

const BORIS_BASE_URL = 'https://s3-us-west-1.amazonaws.com/fftiers/out/';
const borisWeeklyTiers: Record<Format, string> = {
  standard: 'weekly-ALL.csv',
  ppr: 'weekly-ALL-PPR.csv',
  'half-ppr': 'weekly-ALL-HALF-PPR.csv',
};

export const fetchBorisData = async (
  format: Format
): Promise<{ rankings: ScrapedRanking[]; lastModified?: string }> => {
  const url = BORIS_BASE_URL + borisWeeklyTiers[format];

  const response = await fetch(url);
  const text = await response.text();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
  }) as BorisPlayer[];

  const lastModified = response.headers.get('last-modified') ?? undefined;

  const rankings = records.map((record) => ({
    rank: Number(record.Rank),
    name: record['Player.Name'],
    pos: record.Position,
    tier: Number(record.Tier),
  }));

  return { rankings, lastModified };
};
