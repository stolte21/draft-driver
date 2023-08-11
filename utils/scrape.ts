import { parse } from 'node-html-parser';
import { Format } from 'types';

const TEAM_TO_ABRV_MAP = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'Los Angeles Chargers': 'LAC',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Los Angeles Rams': 'LAR',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WSH',
};

const FANTASY_PROS_BASE_URL = 'https://www.fantasypros.com/nfl/adp';
const fantasyProsFormatPages: Record<Format, string> = {
  standard: '/overall.php',
  ppr: '/ppr-overall.php',
  'half-ppr': '/half-point-ppr-overall.php',
};

export const fetchFantasyProsData = async (format: Format) => {
  const url = FANTASY_PROS_BASE_URL + fantasyProsFormatPages[format];

  const response = await fetch(url);
  const text = await response.text();
  const root = parse(text);
  const table = root.querySelectorAll('.player-table tbody tr');
  const ranks = [];

  for (const row of table) {
    const [rankHTML, nameHTML, posHTML] = row.querySelectorAll('td');
    const rank = Number(rankHTML.text);
    let name = nameHTML.childNodes[0].text;
    let team = nameHTML.querySelector('small')?.text;
    const pos = posHTML.text.replace(/\d+/g, '');

    if (pos === 'DST') {
      name = name.replace(' DST', '');
      //@ts-expect-error
      team = TEAM_TO_ABRV_MAP[name];
    }

    ranks.push({ rank, name, team, pos });
  }

  return ranks;
};
