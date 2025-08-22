import {
  Flex,
  Text,
  Checkbox,
  IconButton,
} from '@chakra-ui/react';
import { MinusIcon } from '@chakra-ui/icons';
import { ListChildComponentProps } from 'react-window';
import { useDraft } from 'providers/DraftProvider';
import { Player } from 'types';

type DraftBoardKeeperRowProps = {
  players: Player[];
};

const DraftBoardKeeperRow = (
  props: ListChildComponentProps<DraftBoardKeeperRowProps>
) => {
  const { getters, dispatch } = useDraft();
  const player = props.data.players[props.index];
  const checked = getters.teamPlayerIds.has(player.id);

  const handleClickCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    getters.teamPlayerIds.has(player.id)
      ? dispatch({ type: 'remove-roster', payload: player.id })
      : dispatch({
          type: 'add-roster',
          payload: { player, round: 0, pick: 0 },
        });
  };

  const handleRemoveKeeper = () => {
    if (getters.teamPlayerIds.has(player.id)) {
      dispatch({ type: 'remove-roster', payload: player.id });
    }
    dispatch({ type: 'remove-keeper', payload: player.id });
  };

  return (
    <Flex
      style={props.style}
      justifyContent="space-between"
      alignItems="center"
      cursor="pointer"
      backgroundColor={checked ? 'blackAlpha.400' : undefined}
      _hover={{
        backdropFilter: !checked ? 'brightness(90%)' : undefined,
      }}
    >
      <Flex width="100%" marginLeft={1} gap={2} overflow="hidden">
        <IconButton
          aria-label={`Remove keeper ${player.name}`}
          icon={<MinusIcon />}
          size="xs"
          marginRight={2}
          isRound
          onClick={handleRemoveKeeper}
        />
        <Text flexShrink={0} flexBasis={10}>
          {player.rank}
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
        onChange={handleClickCheckbox}
        isChecked={checked}
        marginLeft={1}
        marginRight={2}
      />
    </Flex>
  );
};

export default DraftBoardKeeperRow;
