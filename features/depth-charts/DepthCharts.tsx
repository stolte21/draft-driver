import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useDepthCharts } from 'providers/DepthChartsProvider';
import { useDraft } from 'providers/DraftProvider';
import { normalizePlayerName } from 'utils/projections';
import { DepthChartTable } from './components/DepthChartTable';
import { TeamIndexRail } from './components/TeamIndexRail';
import { DepthChart, DepthChartPlayer, Player, Position } from 'types';

const POSITION_ORDER: Position[] = ['QB', 'RB', 'WR', 'TE'];
export const TOOLBAR_HEIGHT = '56px';

// AppBar (64px) + sticky toolbar (56px) + margin: a section whose top is
// above this line is the one the user is currently reading
const ACTIVE_TEAM_THRESHOLD_PX = 140;

// lowercase, strip punctuation/suffixes, then drop spaces and hyphens so
// e.g. "amonra" matches "Amon-Ra St. Brown"
function toSearchKey(value: string) {
  return normalizePlayerName(value).replace(/[-\s]/g, '');
}

export function DepthCharts() {
  const {
    state: { depthCharts },
    getters: { isLoading, isError },
    refetch,
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

  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  useEffect(() => {
    const updateActiveTeam = () => {
      let current: string | null = null;

      for (const chart of filteredDepthCharts) {
        const section = document.getElementById(`team-${chart.team}`);
        if (!section) continue;

        if (
          section.getBoundingClientRect().top <= ACTIVE_TEAM_THRESHOLD_PX
        ) {
          current = chart.team;
        } else {
          break;
        }
      }

      setActiveTeam(current ?? filteredDepthCharts[0]?.team ?? null);
    };

    updateActiveTeam();
    // the page scrolls in an inner Box; scroll events don't bubble but are
    // observable on window in the capture phase. Resize changes layout
    // without firing scroll, so it also triggers a recompute.
    window.addEventListener('scroll', updateActiveTeam, true);
    window.addEventListener('resize', updateActiveTeam);
    return () => {
      window.removeEventListener('scroll', updateActiveTeam, true);
      window.removeEventListener('resize', updateActiveTeam);
    };
  }, [filteredDepthCharts]);

  const scrollToTeam = (team: string) => {
    document
      .getElementById(`team-${team}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getPlayersByPosition = (
    players: DepthChartPlayer[],
    position: Position
  ) => {
    return players.filter((player) => player.pos === position);
  };

  // Sleeper and Boris Chen spell some names differently ("Marvin Harrison"
  // vs "Marvin Harrison Jr."), so exact-id lookups miss; this fallback map
  // keys rankings by normalized name + position instead.
  const playersByNormalizedName = useMemo(() => {
    const map: Record<string, Player> = {};
    Object.values(playersMap).forEach((rankedPlayer) => {
      map[`${normalizePlayerName(rankedPlayer.name)}|${rankedPlayer.position}`] =
        rankedPlayer;
    });
    return map;
  }, [playersMap]);

  const getPlayerWithAdp = (player: DepthChartPlayer) => {
    const rankedPlayer =
      playersMap[player.id] ??
      playersByNormalizedName[
        `${normalizePlayerName(player.name)}|${player.pos}`
      ] ??
      {};

    return {
      ...player,
      ...rankedPlayer,
    };
  };

  const renderTeamDepthChart = (team: DepthChart) => (
    <Box
      key={team.team}
      id={`team-${team.team}`}
      mb={4}
      sx={{ scrollMarginTop: TOOLBAR_HEIGHT }}
    >
      <Heading
        size="md"
        mb={4}
        p={2}
        borderRadius="md"
        bg={panelBg}
        border="1px"
        borderColor={panelBorder}
        position="sticky"
        top={TOOLBAR_HEIGHT}
        zIndex={10}
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
        mb={2}
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

      {isLoading ? (
        <Center mt={12}>
          <Spinner />
        </Center>
      ) : isError && depthCharts.length === 0 ? (
        <VStack mt={12} spacing={4}>
          <Text color="gray.500">
            Failed to load depth charts. Please try again.
          </Text>
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </VStack>
      ) : filteredDepthCharts.length === 0 && searchText ? (
        <Text mt={8} textAlign="center" color="gray.500">
          No players match &quot;{searchText}&quot;
        </Text>
      ) : (
        filteredDepthCharts.map(renderTeamDepthChart)
      )}

      <TeamIndexRail
        teams={filteredDepthCharts.map((chart) => chart.team)}
        activeTeam={activeTeam}
        onSelect={scrollToTeam}
      />
    </Box>
  );
}
