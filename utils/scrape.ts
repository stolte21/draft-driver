import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'node-html-parser';
import {
  Format,
  Position,
  ScrapedRanking,
  DepthChart,
  DepthChartPlayer,
} from 'types';
import { parseId } from 'utils';

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

const fetchRanks = async (url: string) => {
  const response = await fetch(url);
  const text = await response.text();
  const root = parse(text);
  const table = root.querySelectorAll('.player-table tbody tr');
  const ranks: ScrapedRanking[] = [];

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

export const fetchFantasyProsDataAdp = async (format: Format) => {
  const url = FANTASY_PROS_BASE_URL + fantasyProsFormatPages[format];
  return fetchRanks(url);
};

export const fetchFantasyProsRookies = async () => {
  const url = FANTASY_PROS_BASE_URL + '/rookies.php';
  return fetchRanks(url);
};

const depthChartPositionMap: Record<string, Position> = {
  Quarterbacks: 'QB',
  'Running Backs': 'RB',
  'Wide Receivers': 'WR',
  'Tight Ends': 'TE',
};

export const parseDepthCharts = async (): Promise<DepthChart[]> => {
  const filePath = join(process.cwd(), 'public', 'depth-chart.html');
  const html = readFileSync(filePath, 'utf-8');
  const root = parse(html);

  const teams: DepthChart[] = [];

  const teamSections = root.querySelectorAll('.team-list');

  for (const teamSection of teamSections) {
    const teamNameInput = teamSection.querySelector('.team-name');
    const teamName = teamNameInput?.getAttribute('value') || '';

    if (!teamName) continue;

    const players: DepthChartPlayer[] = [];
    const positionLists = teamSection.querySelectorAll('.position-list');

    for (const positionList of positionLists) {
      const positionHead = positionList.querySelector('.position-head');
      if (!positionHead) continue;

      const positionText = positionHead.text.replace('ECR', '').trim();

      const playerItems = positionList.querySelectorAll('ul li');

      for (const item of playerItems) {
        const ecrDiv = item.querySelector('.ecr.pull-left');
        const playerLink = item.querySelector('.fp-player-link');

        if (ecrDiv && playerLink) {
          const ecr = parseInt(ecrDiv.text.trim());
          const playerName = playerLink.text.trim();

          if (!isNaN(ecr) && playerName) {
            const name = playerName;
            const pos = depthChartPositionMap[positionText];

            players.push({
              //@ts-expect-error util expects a certain type
              id: parseId({ name, pos }),
              name: playerName,
              ecr,
              pos: depthChartPositionMap[positionText],
            });
          }
        }
      }
    }

    teams.push({
      team: TEAM_TO_ABRV_MAP[teamName as keyof typeof TEAM_TO_ABRV_MAP],
      players,
    });
  }

  return teams;
};
