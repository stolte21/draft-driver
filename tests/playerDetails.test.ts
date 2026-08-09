import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPlayerDetails,
  deriveByeWeeks,
  fetchPlayerNews,
  findSleeperPlayer,
  getByeWeeks,
  parseNewsItems,
  ScheduleGame,
} from '../utils/playerDetails';
import { clearCache } from '../utils/cache';
import { SleeperPlayerRecord } from '../utils/sleeperPlayers';

function game(week: number, home: string, away: string): ScheduleGame {
  return { week, home, away };
}

describe('deriveByeWeeks', () => {
  it('reports the single missing week per team', () => {
    // 3-week season: CIN misses week 2, PIT misses week 3, BAL/CLE play all 3
    const schedule = [
      game(1, 'CIN', 'PIT'),
      game(1, 'BAL', 'CLE'),
      game(2, 'BAL', 'PIT'),
      game(2, 'CLE', 'BAL'),
      game(3, 'CIN', 'BAL'),
      game(3, 'CLE', 'CIN'),
    ];
    const byes = deriveByeWeeks(schedule);

    expect(byes.CIN).toBe(2);
    expect(byes.PIT).toBe(3);
    expect(byes.BAL).toBeUndefined();
    expect(byes.CLE).toBeUndefined();
  });

  it('omits teams missing more than one week rather than guessing', () => {
    const schedule = [game(1, 'CIN', 'PIT'), game(4, 'CIN', 'PIT')];
    const byes = deriveByeWeeks(schedule);

    expect(byes.CIN).toBeUndefined();
    expect(byes.PIT).toBeUndefined();
  });

  it('returns an empty object for an empty schedule', () => {
    expect(deriveByeWeeks([])).toEqual({});
  });

  it('never reports week 1 as a bye (byes never fall in week 1)', () => {
    // NYJ's only missing week is 1, but that signals partial/bad data,
    // not an actual bye — real NFL byes start in week 2+.
    const schedule = [game(2, 'NYJ', 'BUF'), game(3, 'NYJ', 'MIA')];
    const byes = deriveByeWeeks(schedule);

    expect(byes.NYJ).toBeUndefined();
  });
});

function player(overrides: Partial<SleeperPlayerRecord>): SleeperPlayerRecord {
  return {
    player_id: '1',
    active: true,
    position: 'WR',
    full_name: 'Test Player',
    team: 'CIN',
    search_rank: 100,
    ...overrides,
  };
}

describe('findSleeperPlayer', () => {
  it('matches skill players by normalized name and position', () => {
    const records = {
      '7564': player({
        player_id: '7564',
        full_name: "Ja'Marr Chase",
        position: 'WR',
      }),
    };

    const found = findSleeperPlayer(records, {
      name: 'JaMarr Chase',
      position: 'WR',
    });

    expect(found?.player_id).toBe('7564');
  });

  it('ignores name suffixes like III', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Kenneth Walker III' }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Kenneth Walker',
      position: 'WR',
    });

    expect(found?.player_id).toBe('1');
  });

  it('requires the position to match', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Josh Allen', position: 'QB' }),
    };

    expect(
      findSleeperPlayer(records, { name: 'Josh Allen', position: 'WR' })
    ).toBeNull();
  });

  it('prefers the lower search_rank on duplicate names', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Mike Williams', search_rank: 5000 }),
      '2': player({ player_id: '2', full_name: 'Mike Williams', search_rank: 120 }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Mike Williams',
      position: 'WR',
    });

    expect(found?.player_id).toBe('2');
  });

  it('prefers a team match over a lower search_rank on duplicate names', () => {
    // Real bug: "Frank Gore Jr." (RB, BUF) normalizes to the same key as
    // retired "Frank Gore" — the retired player's much lower search_rank
    // must not beat an explicit team match.
    const records = {
      '1': player({
        player_id: '1',
        full_name: 'Frank Gore',
        position: 'RB',
        team: 'MIA',
        search_rank: 50,
      }),
      '2': player({
        player_id: '2',
        full_name: 'Frank Gore',
        position: 'RB',
        team: 'BUF',
        search_rank: 9000,
      }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Frank Gore',
      position: 'RB',
      team: 'BUF',
    });

    expect(found?.player_id).toBe('2');
  });

  it('treats a null search_rank as worse than any numbered candidate', () => {
    const records = {
      '1': player({ player_id: '1', full_name: 'Bob Smith', search_rank: null }),
      '2': player({ player_id: '2', full_name: 'Bob Smith', search_rank: 300 }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Bob Smith',
      position: 'WR',
    });

    expect(found?.player_id).toBe('2');
  });

  it('matches DSTs by team key', () => {
    const records = {
      CIN: player({
        player_id: 'CIN',
        position: 'DEF',
        full_name: null,
        first_name: 'Cincinnati',
        last_name: 'Bengals',
      }),
    };

    const found = findSleeperPlayer(records, {
      name: 'Cincinnati Bengals',
      position: 'DST',
      team: 'CIN',
    });

    expect(found?.player_id).toBe('CIN');
  });

  it('returns null for a DST query without a team', () => {
    expect(findSleeperPlayer({}, { name: 'Bengals', position: 'DST' })).toBeNull();
  });

  it('rejects a DST match when the team key resolves to a non-DEF record', () => {
    const records = {
      CIN: player({ player_id: '9999', position: 'WR', team: 'CIN' }),
    };

    expect(
      findSleeperPlayer(records, {
        name: 'Cincinnati Bengals',
        position: 'DST',
        team: 'CIN',
      })
    ).toBeNull();
  });
});

describe('buildPlayerDetails', () => {
  it('assembles details from a skill-player record', () => {
    const record = player({
      player_id: '7564',
      full_name: "Ja'Marr Chase",
      position: 'WR',
      team: 'CIN',
      number: 1,
      age: 26,
      birth_date: '2000-03-01',
      height: '72',
      weight: '205',
      college: 'LSU',
      years_exp: 5,
      status: 'Active',
      depth_chart_position: 'LWR',
      depth_chart_order: 1,
      metadata: { rookie_year: '2021' },
    });

    const details = buildPlayerDetails(record, 6, []);

    expect(details).toEqual({
      playerId: '7564',
      name: "Ja'Marr Chase",
      team: 'CIN',
      position: 'WR',
      number: 1,
      age: 26,
      birthDate: '2000-03-01',
      heightIn: 72,
      weightLb: 205,
      college: 'LSU',
      yearsExp: 5,
      rookieYear: 2021,
      status: 'Active',
      depthChartPosition: 'LWR',
      depthChartOrder: 1,
      injury: null,
      byeWeek: 6,
      photoUrl: 'https://sleepercdn.com/content/nfl/players/7564.jpg',
      news: [],
    });
  });

  it('maps injury fields when injury_status is set', () => {
    const record = player({
      injury_status: 'PUP',
      injury_body_part: 'Knee - ACL',
      injury_notes: 'Surgery',
    });

    const details = buildPlayerDetails(record, null, []);

    expect(details.injury).toEqual({
      status: 'PUP',
      bodyPart: 'Knee - ACL',
      notes: 'Surgery',
      startDate: null,
    });
  });

  it('builds DST details with a team-logo photo and DST position', () => {
    const record = player({
      player_id: 'CIN',
      position: 'DEF',
      full_name: null,
      first_name: 'Cincinnati',
      last_name: 'Bengals',
      team: 'CIN',
      height: null,
      weight: null,
    });

    const details = buildPlayerDetails(record, 6, []);

    expect(details.name).toBe('Cincinnati Bengals');
    expect(details.position).toBe('DST');
    expect(details.photoUrl).toBe(
      'https://sleepercdn.com/images/team_logos/nfl/cin.png'
    );
    expect(details.heightIn).toBeNull();
    expect(details.weightLb).toBeNull();
  });

  it('nulls out unparseable numeric strings', () => {
    const record = player({ height: 'tall', metadata: { rookie_year: '' } });

    const details = buildPlayerDetails(record, null, []);

    expect(details.heightIn).toBeNull();
    expect(details.rookieYear).toBeNull();
  });

  it('parses feet-inches height strings', () => {
    const record = player({ height: `6'2"` });

    const details = buildPlayerDetails(record, null, []);

    expect(details.heightIn).toBe(74);
  });

  it('parses pure-inch height strings', () => {
    const record = player({ height: '72' });

    const details = buildPlayerDetails(record, null, []);

    expect(details.heightIn).toBe(72);
  });

  it('parses two-digit feet-inches heights', () => {
    const record = player({ height: `5'11"` });

    expect(buildPlayerDetails(record, null, []).heightIn).toBe(71);
  });

  it('rejects a height of "0"', () => {
    const record = player({ height: '0' });

    const details = buildPlayerDetails(record, null, []);

    expect(details.heightIn).toBeNull();
  });

  it('rejects a non-numeric rookie year', () => {
    const record = player({ metadata: { rookie_year: '2021abc' } });

    const details = buildPlayerDetails(record, null, []);

    expect(details.rookieYear).toBeNull();
  });
});

describe('parseNewsItems', () => {
  it('parses a GraphQL news payload', () => {
    const payload = {
      data: {
        get_player_news: [
          {
            metadata: {
              title: 'Chase Sets the Market',
              description: 'A description.',
              analysis: 'Some analysis.',
              url: 'https://example.com/story',
            },
            source: 'rotoballer',
            published: 1784906886000,
          },
        ],
      },
    };

    expect(parseNewsItems(payload)).toEqual([
      {
        title: 'Chase Sets the Market',
        description: 'A description.',
        analysis: 'Some analysis.',
        source: 'rotoballer',
        url: 'https://example.com/story',
        published: 1784906886000,
      },
    ]);
  });

  it('tolerates missing optional fields', () => {
    const payload = {
      data: {
        get_player_news: [
          { metadata: { title: 'Bare item' }, source: 'nfl', published: 123 },
        ],
      },
    };

    expect(parseNewsItems(payload)).toEqual([
      {
        title: 'Bare item',
        description: null,
        analysis: null,
        source: 'nfl',
        url: null,
        published: 123,
      },
    ]);
  });

  it('drops malformed items and returns [] for garbage payloads', () => {
    expect(parseNewsItems(null)).toEqual([]);
    expect(parseNewsItems({})).toEqual([]);
    expect(parseNewsItems({ data: { get_player_news: 'nope' } })).toEqual([]);
    expect(
      parseNewsItems({
        data: { get_player_news: [{ source: 'x', published: 1 }] },
      })
    ).toEqual([]);
  });

  it('sorts items by published descending, ignoring response order', () => {
    const payload = {
      data: {
        get_player_news: [
          { metadata: { title: 'Older' }, source: 'nfl', published: 100 },
          { metadata: { title: 'Newest' }, source: 'nfl', published: 300 },
          { metadata: { title: 'Middle' }, source: 'nfl', published: 200 },
        ],
      },
    };

    expect(parseNewsItems(payload).map((item) => item.title)).toEqual([
      'Newest',
      'Middle',
      'Older',
    ]);
  });
});

describe('fetchPlayerNews', () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns [] without calling fetch for an invalid player id', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchPlayerNews('CIN team!')).toEqual([]);
    expect(await fetchPlayerNews('')).toEqual([]);
    expect(await fetchPlayerNews('A'.repeat(17))).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns [] when the request responds non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    );

    expect(await fetchPlayerNews('7564')).toEqual([]);
  });

  it('returns [] when the request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(await fetchPlayerNews('7564')).toEqual([]);
  });
});

describe('getByeWeeks', () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects on an empty schedule payload without caching the failure, then retries', async () => {
    // Second call's schedule: CIN plays only week 1 (real bye at week 2);
    // BAL plays only week 2 (missing week 1, which is deliberately NOT a
    // bye) — distinguishes a real resolved value from an empty `{}`.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { week: 1, home: 'CIN', away: 'PIT' },
          { week: 2, home: 'BAL', away: 'PIT' },
        ],
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getByeWeeks(2026)).rejects.toThrow();
    await expect(getByeWeeks(2026)).resolves.toEqual({ CIN: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
