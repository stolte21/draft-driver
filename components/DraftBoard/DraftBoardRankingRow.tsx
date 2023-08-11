import { useColorMode, Flex, Text, BackgroundProps } from '@chakra-ui/react';
import { ListChildComponentProps } from 'react-window';
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
      </Text>
    </Flex>
  );
};

export default DraftBoardRankingRow;
