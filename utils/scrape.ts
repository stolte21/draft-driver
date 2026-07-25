import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'node-html-parser';
import { Position, DepthChart, DepthChartPlayer } from 'types';
import { parseId } from 'utils';

export const TEAM_TO_ABRV_MAP = {
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
