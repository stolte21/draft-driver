import { parse } from 'node-html-parser';
import { Format } from 'types';

const TEAM_TO_ABRV_MAP = {
  Cardinals: 'ARI',
  Falcons: 'ATL',
  Ravens: 'BAL',
  Bills: 'BUF',
  Panthers: 'CAR',
  Bears: 'CHI',
  Bengals: 'CIN',
  Browns: 'CLE',
  Cowboys: 'DAL',
  Broncos: 'DEN',
  Lions: 'DET',
  Packers: 'GB',
  Texans: 'HOU',
  Colts: 'IND',
  Jaguars: 'JAX',
  Chiefs: 'KC',
  'Las Vegas': 'LV',
  Raiders: 'LV',
  Dolphins: 'MIA',
  Vikings: 'MIN',
  Patriots: 'NE',
  Saints: 'NO',
  Giants: 'NYG',
  'N.Y. Giants': 'NYG',
  Jets: 'NYJ',
  'N.Y. Jets': 'NYJ',
  Eagles: 'PHI',
  Steelers: 'PIT',
  Chargers: 'LAC',
  'L.A. Chargers': 'LAC',
  '49ers': 'SF',
  Seahawks: 'SEA',
  Rams: 'LAR',
  'L.A. Rams': 'LAR',
  Buccaneers: 'TB',
  Titans: 'TEN',
  Commanders: 'WSH',
  Team: 'WSH',
};

const FANTASY_PROS_BASE_URL = 'https://www.fantasypros.com/nfl/adp';
const fantasyProsFormatPages: Record<Format, string> = {
  standard: '/overall.php',
  ppr: '/ppr-overall.php',
  'half-ppr': '/half-point-ppr-overall.php',
};

export const scrapeFantasyPros = async (format: Format) => {
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
