import { describe, it, expect } from 'vitest';
import { parseBorisCsv } from 'utils/boris';

const SAMPLE_CSV = `"Rank","Player.Name","Tier","Position","Best.Rank","Worst.Rank","Avg.Rank","Std.Dev"
1,"Ja'Marr Chase","1","WR",1,4,1.78,1.05
2,"Puka Nacua","1","WR",1,7,3.07,1.26
3,"Jahmyr Gibbs","2","RB",1,7,3.2,1.73
`;

describe('parseBorisCsv', () => {
  it('maps the fftiers CSV columns to rankings', () => {
    const rankings = parseBorisCsv(SAMPLE_CSV);

    expect(rankings).toEqual([
      { rank: 1, name: "Ja'Marr Chase", pos: 'WR', tier: 1 },
      { rank: 2, name: 'Puka Nacua', pos: 'WR', tier: 1 },
      { rank: 3, name: 'Jahmyr Gibbs', pos: 'RB', tier: 2 },
    ]);
  });

  it('handles empty input', () => {
    expect(parseBorisCsv('')).toEqual([]);
  });
});
