import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Format, ScrapedRanking } from 'types';

type BorisPlayer = {
  Rank: string;
  'Player.Name': string;
  Tier: string;
  Position: string;
};

type RawTiers = { text: string; lastModified?: string };

const BORIS_BASE_URL = 'https://s3-us-west-1.amazonaws.com/fftiers/out/';
const LOCAL_TIERS_DIR = path.join(process.cwd(), 'data', 'tiers');

const borisWeeklyTiers: Record<Format, string> = {
  standard: 'weekly-ALL.csv',
  ppr: 'weekly-ALL-PPR.csv',
  'half-ppr': 'weekly-ALL-HALF-PPR.csv',
};

const readLocalTiers = async (format: Format): Promise<RawTiers> => {
  const filePath = path.join(LOCAL_TIERS_DIR, borisWeeklyTiers[format]);
  const [text, stat] = await Promise.all([
    fs.readFile(filePath, 'utf-8'),
    fs.stat(filePath),
  ]);

  return { text, lastModified: stat.mtime.toUTCString() };
};

const fetchS3Tiers = async (format: Format): Promise<RawTiers> => {
  const url = BORIS_BASE_URL + borisWeeklyTiers[format];
  const response = await fetch(url);
  const text = await response.text();
  const lastModified = response.headers.get('last-modified') ?? undefined;

  return { text, lastModified };
};

export const parseBorisCsv = (text: string): ScrapedRanking[] => {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
  }) as BorisPlayer[];

  return records.map((record) => ({
    rank: Number(record.Rank),
    name: record['Player.Name'],
    pos: record.Position,
    tier: Number(record.Tier),
  }));
};

export const fetchBorisData = async (
  format: Format,
): Promise<{ rankings: ScrapedRanking[]; lastModified?: string }> => {
  let raw: RawTiers;

  if (process.env.TIERS_SOURCE === 's3') {
    raw = await fetchS3Tiers(format);
  } else {
    try {
      raw = await readLocalTiers(format);
    } catch {
      raw = await fetchS3Tiers(format);
    }
  }

  return { rankings: parseBorisCsv(raw.text), lastModified: raw.lastModified };
};
