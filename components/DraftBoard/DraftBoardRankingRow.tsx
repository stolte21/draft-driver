import { useColorMode, Flex, Text } from '@chakra-ui/react';
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
  const { computed, dispatch } = useDraft();
  const player = props.data.players[props.index];
  const isPlayerDrafted = computed.draftedPlayerIds.has(player.id);

  return (
    <Flex
      style={props.style}
      alignItems="center"
      gap={2}
      cursor={isPlayerDrafted ? 'not-allowed' : 'pointer'}
      backgroundColor={
        isPlayerDrafted
          ? colorMode === 'dark'
            ? 'blackAlpha.400'
            : 'gray.300'
          : undefined
      }
      onClick={
        !isPlayerDrafted
          ? () => dispatch({ type: 'draft', payload: player })
          : undefined
      }
      onMouseDown={handlePreventDoubleClickHighlight}
      _hover={{
        backgroundColor: !isPlayerDrafted
          ? colorMode === 'dark'
            ? 'blackAlpha.100'
            : 'gray.100'
          : undefined,
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
