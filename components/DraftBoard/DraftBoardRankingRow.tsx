import { Flex, Text } from '@chakra-ui/react';
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
  const { computed, dispatch } = useDraft();
  const player = props.data.players[props.index];
  const isPlayerDrafted = computed.draftedPlayerIds.has(player.id);

  return (
    <Flex
      style={props.style}
      alignItems="center"
      gap={2}
      cursor={isPlayerDrafted ? 'not-allowed' : 'pointer'}
      backgroundColor={isPlayerDrafted ? 'blackAlpha.400' : undefined}
      onClick={
        !isPlayerDrafted
          ? () => dispatch({ type: 'draft', payload: player })
          : undefined
      }
      onMouseDown={handlePreventDoubleClickHighlight}
      _hover={{
        backgroundColor: !isPlayerDrafted ? 'blackAlpha.100' : undefined,
      }}
    >
      <Text marginLeft={1} flexBasis={10}>
        {player.rank}
      </Text>
      <Text flexBasis={10}>{player.position}</Text>
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
