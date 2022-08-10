import { Flex, Text, Checkbox } from '@chakra-ui/react';
import { ListChildComponentProps } from 'react-window';
import { useDraft } from 'providers/DraftProvider';
import { handlePreventDoubleClickHighlight } from 'utils';
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
      onMouseDown={handlePreventDoubleClickHighlight}
      _hover={{
        backgroundColor: 'blackAlpha.100',
      }}
    >
      <Flex width="100%" marginLeft={1} gap={2} overflow="hidden">
        <Text flexShrink={0} flexBasis={8}>
          {state.draftedPlayers.length - props.index}
        </Text>
        <Text
          flexGrow={1}
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
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
