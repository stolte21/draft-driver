import { useState } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useColorMode, Flex, Box, Heading, Skeleton } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';
import DraftBoardRankingRow from 'components/DraftBoard/DraftBoardRankingRow';
import DraftBoardPickRow from 'components/DraftBoard/DraftBoardPickRow';
import DraftBoardPositionFilter from 'components/DraftBoard/DraftBoardPositionFilter';
import { hasOnlySpecialFilters } from 'utils';
import { Player, Position, SpecialFilter } from 'types';

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
  const { getters } = useDraft();
  const [positionFilters, setPositionFilters] = useState<
    Set<Position | SpecialFilter>
  >(new Set());

  let filteredPlayers = props.players;

  if (props.variant === 'rankings' && positionFilters.size > 0) {
    filteredPlayers = props.players.filter((player) => {
      const hasRookieFilter = positionFilters.has('R');
      const rookieFilterCheck = hasRookieFilter ? player.isRookie : true;
      const hasFavoriteFilter = positionFilters.has('FAV');
      const favoriteFilterCheck = hasFavoriteFilter
        ? getters.favoritePlayerIds.has(player.id)
        : true;
      const hasOnlySpecial = hasOnlySpecialFilters(positionFilters);

      if (hasOnlySpecial) {
        return rookieFilterCheck && favoriteFilterCheck;
      } else {
        return (
          positionFilters.has(player.position) &&
          rookieFilterCheck &&
          favoriteFilterCheck
        );
      }
    });
  }

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
