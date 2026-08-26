import { Divider, Flex, Heading, Text } from '@chakra-ui/react';
import { useDepthCharts } from 'providers/DepthChartsProvider';
import { normalizePlayerName } from 'utils/projections';
import { Player, Position } from 'types';

// depth charts only exist for skill positions (see utils/depthCharts.ts)
const DEPTH_CHART_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];

type PlayerDepthChartProps = {
  player: Player;
  team: string | null;
};

/**
 * The player's team depth chart at their position, with the viewed player
 * highlighted. Nice-to-have data: renders nothing while loading, on error,
 * or when there's no chart for the team/position.
 */
const PlayerDepthChart = (props: PlayerDepthChartProps) => {
  const {
    state: { depthCharts },
    getters: { isLoading, isError },
  } = useDepthCharts();

  if (isLoading || isError || !props.team) return null;
  if (!DEPTH_CHART_POSITIONS.includes(props.player.position)) return null;

  const teamChart = depthCharts.find((chart) => chart.team === props.team);
  const positionPlayers =
    teamChart?.players.filter(
      (entry) => entry.pos === props.player.position
    ) ?? [];

  if (positionPlayers.length === 0) return null;

  // ids on both sides come from parseId, but Sleeper and Boris Chen spell
  // some names differently ("Marvin Harrison" vs "Marvin Harrison Jr."),
  // so fall back to normalized-name matching — same trick the depth
  // charts page uses.
  const normalizedName = normalizePlayerName(props.player.name);

  return (
    <>
      <Divider marginY={6} />
      <Heading as="h3" size="sm" marginBottom={4}>
        {props.team} {props.player.position} Depth Chart
      </Heading>
      <Flex flexDirection="column" gap={2}>
        {positionPlayers.map((entry, index) => {
          const isViewedPlayer =
            entry.id === props.player.id ||
            normalizePlayerName(entry.name) === normalizedName;

          return (
            <Flex key={entry.id} gap={3} alignItems="baseline">
              <Text
                flexShrink={0}
                flexBasis={5}
                textAlign="right"
                color="whiteAlpha.700"
                fontSize="sm"
              >
                {index + 1}
              </Text>
              <Text
                fontWeight={isViewedPlayer ? 'bold' : 'normal'}
                color={isViewedPlayer ? 'blue.200' : undefined}
              >
                {entry.name}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </>
  );
};

export default PlayerDepthChart;
