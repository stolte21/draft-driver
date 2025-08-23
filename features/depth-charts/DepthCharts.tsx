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

  const getPositionalRanking = (player: DepthChartPlayer) => {
    const rankedPlayer = playersMap[player.id];

    if (!rankedPlayer) {
      return '—';
    }

    return rankedPlayer.pRank;
  };

  const renderTeamDepthChart = (team: DepthChart) => (
    <Box key={team.team} mb={8}>
      <Heading size="md" mb={4}>
        {team.team}
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {POSITION_ORDER.map((position) => {
          const positionPlayers = getPlayersByPosition(team.players, position);

          return (
            <VStack key={position} align="stretch" spacing={2}>
              <Text fontSize="sm" fontWeight="semibold">
                {POSITION_LABELS[position]}
              </Text>

              <UnorderedList styleType="none" ml={0} spacing={1}>
                {positionPlayers.map((player) => (
                  <ListItem key={`${team.team}-${player.name}`}>
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="bold" minW="6">
                        {getPositionalRanking(player)}
                      </Text>
                      <Text
                        fontSize="sm"
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        {player.name}
                      </Text>
                    </HStack>
                  </ListItem>
                ))}
              </UnorderedList>
            </VStack>
          );
        })}
      </SimpleGrid>
    </Box>
  );

  return <Box>{depthCharts.map(renderTeamDepthChart)}</Box>;
}
