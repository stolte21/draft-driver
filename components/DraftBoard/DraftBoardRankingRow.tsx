import { Box, Text } from '@chakra-ui/react';
import { ListChildComponentProps } from 'react-window';
import { useDraft } from 'providers/DraftProvider';
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
    <Box
      style={props.style}
      display="flex"
      alignItems="center"
      cursor={isPlayerDrafted ? 'not-allowed' : 'pointer'}
      onClick={
        !isPlayerDrafted
          ? () => dispatch({ type: 'draft', payload: player })
          : undefined
      }
      /**
       * This prevents text from being selected after double clicking
       * but still allows the text to be click+drag highlighted.
       */
      onMouseDown={(e) => e.detail > 1 && e.preventDefault()}
    >
      <Text
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        marginLeft={1}
        textDecoration={
          computed.draftedPlayerIds.has(player.id) ? 'line-through' : 'none'
        }
      >
        {player.name}
      </Text>
    </Box>
  );
};

export default DraftBoardRankingRow;
