import { useMemo, useState } from 'react';
import {
  Box,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useDepthCharts } from 'providers/DepthChartsProvider';
import { useDraft } from 'providers/DraftProvider';
import { normalizePlayerName } from 'utils/projections';
import { DepthChartTable } from './components/DepthChartTable';
import { DepthChart, DepthChartPlayer, Position } from 'types';

const POSITION_ORDER: Position[] = ['QB', 'RB', 'WR', 'TE'];
export const TOOLBAR_HEIGHT = '56px';

// lowercase, strip punctuation/suffixes, then drop spaces and hyphens so
// e.g. "amonra" matches "Amon-Ra St. Brown"
function toSearchKey(value: string) {
  return normalizePlayerName(value).replace(/[-\s]/g, '');
}

export function DepthCharts() {
  const {
    state: { depthCharts },
  } = useDepthCharts();
  const {
    getters: { playersMap },
  } = useDraft();

  const [searchText, setSearchText] = useState('');

  const toolbarBg = useColorModeValue('white', 'gray.800');
  const panelBg = useColorModeValue('gray.100', 'gray.700');
  const panelBorder = useColorModeValue('gray.300', 'gray.600');
  const valueBg = useColorModeValue('blue.100', 'blue.900');

  const filteredDepthCharts = useMemo(() => {
    const query = toSearchKey(searchText);
    if (!query) return depthCharts;

    return depthCharts
      .map((team) => ({
        ...team,
        players: team.players.filter((player) =>
          toSearchKey(player.name).includes(query)
        ),
      }))
      .filter((team) => team.players.length > 0);
  }, [depthCharts, searchText]);

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
      <Heading
        size="md"
        mb={4}
        p={2}
        borderRadius="md"
        bg={panelBg}
        border="1px"
        borderColor={panelBorder}
      >
        {team.team}
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {POSITION_ORDER.map((position) => {
          const positionPlayers = getPlayersByPosition(team.players, position);
          if (positionPlayers.length === 0) return null;

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

  return (
    <Box>
      <HStack
        position="sticky"
        top={0}
        zIndex={20}
        height={TOOLBAR_HEIGHT}
        bg={toolbarBg}
        spacing={4}
        justifyContent="space-between"
      >
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search players..."
          maxWidth="300px"
          size="sm"
          borderRadius="md"
        />
        <HStack spacing={3} flexShrink={0}>
          <Box w={4} h={4} bg={valueBg} borderRadius="sm" />
          <Text fontSize="sm" fontWeight="bold" color="gray.500">
            Value Pick
          </Text>
        </HStack>
      </HStack>

      {filteredDepthCharts.length === 0 ? (
        <Text mt={8} textAlign="center" color="gray.500">
          No players match &quot;{searchText}&quot;
        </Text>
      ) : (
        filteredDepthCharts.map(renderTeamDepthChart)
      )}
    </Box>
  );
}
