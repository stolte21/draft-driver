import { useState } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useColorMode, Flex, Box, Heading } from '@chakra-ui/react';
import { Player, Position } from 'types';
import DraftBoardRankingRow from 'components/DraftBoard/DraftBoardRankingRow';
import DraftBoardPickRow from 'components/DraftBoard/DraftBoardPickRow';
import DraftBoardPositionFilter from 'components/DraftBoard/DraftBoardPositionFilter';

type DraftBoardListProps = {
  players: Player[];
  position?: Position;
  height: number;
  variant: 'rankings' | 'picks';
};

const DraftBoardList = (props: DraftBoardListProps) => {
  const { colorMode } = useColorMode();
  const [positionFilters, setPositionFilters] = useState<Set<Position>>(
    new Set()
  );

  const filteredPlayers =
    props.variant === 'picks' || positionFilters.size === 0
      ? props.players
      : props.players.filter((player) => positionFilters.has(player.position));

  return (
    <Flex flexDirection="column" height="100%">
      <Box
        display="flex"
        alignItems="center"
        height={8}
        padding={1}
        paddingLeft={2}
        marginBottom={1}
        rounded="md"
        backgroundColor={
          colorMode === 'dark' ? 'blackAlpha.300' : 'blackAlpha.200'
        }
      >
        <Heading as="h3" size="sm" textTransform="uppercase">
          {props.variant}
        </Heading>
        {props.variant === 'rankings' && (
          <DraftBoardPositionFilter
            filters={positionFilters}
            onChangeFilter={(set) => setPositionFilters(set)}
          />
        )}
      </Box>

      <Box height="100%">
        <AutoSizer disableWidth>
          {/* for some reason the build doesn't pick up the correct type
              in the render prop */}
          {({ height }: { height: number }) => (
            <FixedSizeList
              height={height}
              width="100%"
              itemCount={filteredPlayers.length}
              itemSize={30}
              // some obscure players don't have a fantasy data id so fallback to the name.
              // this probably won't be an issue once trim the players based on rankings
              itemKey={(index) =>
                filteredPlayers[index].id ?? filteredPlayers[index].name
              }
              itemData={{
                players: filteredPlayers,
              }}
            >
              {props.variant === 'rankings'
                ? DraftBoardRankingRow
                : DraftBoardPickRow}
            </FixedSizeList>
          )}
        </AutoSizer>
      </Box>
    </Flex>
  );
};

export default DraftBoardList;
