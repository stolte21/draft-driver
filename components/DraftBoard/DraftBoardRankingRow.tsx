import { Box, Flex, Text, IconButton, useColorMode } from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';
import { ListChildComponentProps } from 'react-window';
import HeartIcon from 'components/Icons/HeartIcon';
import { useDraft } from 'providers/DraftProvider';
import { handlePreventDoubleClickHighlight } from 'utils';
import { Player } from 'types';

type DraftBoardRankingRowProps = {
  players: Player[];
};

const DraftBoardRankingRow = (
  props: ListChildComponentProps<DraftBoardRankingRowProps>
) => {
  const { colorMode } = useColorMode();
  const { getters, dispatch } = useDraft();
  const player = props.data.players[props.index];
  const isPlayerDrafted = getters.draftedPlayerIds.has(player.id);
  const isPlayerFavorite = getters.favoritePlayerIds.has(player.id);

  return (
    <Flex
      style={props.style}
      alignItems="center"
      gap={2}
      cursor={isPlayerDrafted ? 'not-allowed' : 'pointer'}
      backgroundColor={
        isPlayerDrafted
          ? colorMode === 'dark'
            ? 'blackAlpha.800'
            : 'blackAlpha.700'
          : player.tier && player.tier % 2 === 0
          ? colorMode === 'dark'
            ? 'blackAlpha.500'
            : 'blackAlpha.400'
          : undefined
      }
      onClick={
        !isPlayerDrafted
          ? () => dispatch({ type: 'draft', payload: player })
          : undefined
      }
      onMouseDown={handlePreventDoubleClickHighlight}
      _hover={{
        backdropFilter: !isPlayerDrafted ? 'brightness(90%)' : undefined,
        '& .favorite-icon': {
          visibility: 'visible',
        },
      }}
    >
      <Text flexShrink={0} marginLeft={1} flexBasis={10}>
        {player.rank}
      </Text>
      <Text flexShrink={0} flexBasis={10}>
        {player.team}
      </Text>
      <Text flexShrink={0} flexBasis={10}>
        {player.position}
      </Text>
      <Text
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        textDecoration={isPlayerDrafted ? 'line-through' : 'none'}
      >
        {player.name}
        {player.isRookie && <StarIcon verticalAlign="super" h={2} />}
      </Text>
      <Box flexGrow={1} textAlign="right">
        <IconButton
          className="favorite-icon"
          aria-label="favorite"
          icon={
            <HeartIcon
              filled={isPlayerFavorite}
              color={isPlayerFavorite ? 'blue.300' : ''}
            />
          }
          visibility={isPlayerFavorite ? 'visible' : 'hidden'}
          size="xs"
          variant="ghost"
          isRound
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'toggle-favorite', payload: player.id });
          }}
        />
      </Box>
      {player.tier && (
        <Text
          display={['none', 'none', 'block']}
          textAlign="right"
          marginRight={2}
          // pull the fav icon a little closer
          marginLeft={-0.5}
          color={colorMode === 'dark' ? 'whiteAlpha.500' : 'blackAlpha.700'}
        >
          Tier {player.tier}
        </Text>
      )}
    </Flex>
  );
};

export default DraftBoardRankingRow;
