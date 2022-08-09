import { Flex, Box, Text, Checkbox } from '@chakra-ui/react';
import { ListChildComponentProps } from 'react-window';
import { useDraft } from 'providers/DraftProvider';
import { Player } from 'types';

type DraftBoardPickRowProps = {
  players: Player[];
};

const DraftBoardPickRow = (
  props: ListChildComponentProps<DraftBoardPickRowProps>
) => {
  const { state, computed, dispatch } = useDraft();
  const player = props.data.players[props.index];

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();

    computed.teamPlayerIds.has(player.id)
      ? dispatch({ type: 'remove-roster', payload: player.id })
      : dispatch({ type: 'add-roster', payload: player });
  };

  return (
    <Flex
      style={props.style}
      justifyContent="space-between"
      alignItems="center"
      cursor="pointer"
      onClick={handleClick}
      /**
       * This prevents text from being selected after double clicking
       * but still allows the text to be click+drag highlighted.
       */
      onMouseDown={(e) => e.detail > 1 && e.preventDefault()}
    >
      <Flex marginLeft={1} gap={2} overflow="hidden">
        <Text>{state.draftedPlayers.length - props.index}</Text>
        <Text whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
          {player.name}
        </Text>
      </Flex>

      <Checkbox
        onClick={handleClick}
        isChecked={computed.teamPlayerIds.has(player.id)}
        marginLeft={1}
        marginRight={2}
      />
    </Flex>
  );
};

export default DraftBoardPickRow;
