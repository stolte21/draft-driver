import {
  Box,
  Heading,
  SimpleGrid,
  VStack,
  Text,
  HStack,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { useDepthCharts } from 'providers/DepthChartsProvider';
import { useDraft } from 'providers/DraftProvider';
import { DepthChartTable } from './components/DepthChartTable';
import { DepthChart, DepthChartPlayer, Position } from 'types';

const POSITION_ORDER: Position[] = ['QB', 'RB', 'WR', 'TE'];
const POSITION_LABELS: Partial<Record<Position, string>> = {
  QB: 'ECR Quarterbacks',
  RB: 'ECR Running Backs',
  WR: 'ECR Wide Receivers',
  TE: 'ECR Tight Ends',
};

export function DepthCharts() {
  const {
    state: { depthCharts },
  } = useDepthCharts();
  const {
    getters: { playersMap },
  } = useDraft();

  const getPlayersByPosition = (
    players: DepthChartPlayer[],
    position: Position
  ) => {
    return players.filter((player) => player.pos === position);
  };

  const getPlayerWithAdp = (player: DepthChartPlayer) => {
    const rankedPlayer = playersMap[player.id] ?? {};

    return {
      ...player,
      ...rankedPlayer,
    };
  };

  const renderTeamDepthChart = (team: DepthChart) => (
    <Box key={team.team} mb={4}>
      <Heading size="md" mb={4} p={2} borderRadius="md" bg="gray.700">
        {team.team}
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {POSITION_ORDER.map((position) => {
          const positionPlayers = getPlayersByPosition(team.players, position);
          const rankedPlayers = positionPlayers.map(getPlayerWithAdp);

          return (
            <VStack key={position} align="stretch" spacing={2}>
              <DepthChartTable position={position} players={rankedPlayers} />
            </VStack>
          );
        })}
      </SimpleGrid>
    </Box>
  );

  return <Box>{depthCharts.map(renderTeamDepthChart)}</Box>;
}
