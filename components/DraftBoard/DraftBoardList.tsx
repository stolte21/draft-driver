import { useState } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useColorMode, Flex, Box, Heading, Skeleton } from '@chakra-ui/react';
import { Player, Position } from 'types';
import DraftBoardRankingRow from 'components/DraftBoard/DraftBoardRankingRow';
import DraftBoardPickRow from 'components/DraftBoard/DraftBoardPickRow';
import DraftBoardPositionFilter from 'components/DraftBoard/DraftBoardPositionFilter';

type DraftBoardListProps = {
  players: Player[];
  position?: Position;
  height: number;
  variant: 'rankings' | 'picks';
  isLoading?: boolean;
};

function renderLoaderRows(availableHeight: number) {
  const rows = Math.floor(availableHeight / 30);
  return (
    <Box gap={1} display="flex" flexDirection="column" height={availableHeight}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={30} marginX={1} rounded="sm" />
      ))}
    </Box>
  );
}

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
        height={12}
        paddingLeft={2}
        marginBottom={1}
        rounded="md"
        backgroundColor={
          colorMode === 'dark' ? 'blackAlpha.300' : 'blackAlpha.200'
        }
      >
        <Box>
          <Heading as="h3" size="sm" textTransform="uppercase">
            {props.variant}
          </Heading>
        </Box>
        {props.variant === 'rankings' && (
          <DraftBoardPositionFilter
            filters={positionFilters}
            onChangeFilter={(set) => setPositionFilters(set)}
          />
        )}
      </Box>

      <Box height="100%">
        <AutoSizer disableWidth>
          {({ height }: { height: number }) =>
            props.isLoading ? (
              renderLoaderRows(height)
            ) : (
              <FixedSizeList
                height={height}
                width="100%"
                itemCount={filteredPlayers.length}
                itemSize={30}
                itemKey={(index) => filteredPlayers[index].id}
                itemData={{
                  players: filteredPlayers,
                }}
              >
                {props.variant === 'rankings'
                  ? DraftBoardRankingRow
                  : DraftBoardPickRow}
              </FixedSizeList>
            )
          }
        </AutoSizer>
      </Box>
    </Flex>
  );
};

export default DraftBoardList;
