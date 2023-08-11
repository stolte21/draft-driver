import { useColorMode, Flex, Text, Checkbox } from '@chakra-ui/react';
import { ListChildComponentProps } from 'react-window';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { handlePreventDoubleClickHighlight } from 'utils';
import { Player } from 'types';

type DraftBoardPickRowProps = {
  players: Player[];
};

const DraftBoardPickRow = (
  props: ListChildComponentProps<DraftBoardPickRowProps>
) => {
  const { colorMode } = useColorMode();
  const { state: settings } = useSettings();
  const { state, getters, dispatch } = useDraft();
  const player = props.data.players[props.index];
  const checked = getters.teamPlayerIds.has(player.id);

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();

    getters.teamPlayerIds.has(player.id)
      ? dispatch({ type: 'remove-roster', payload: player.id })
      : dispatch({ type: 'add-roster', payload: player });
  };

  const rawPick = state.draftedPlayers.length - props.index - 1;
  const round = Math.floor(rawPick / settings.numTeams) + 1;
  const pick = (rawPick % settings.numTeams) + 1;

  return (
    <Flex
      style={props.style}
      justifyContent="space-between"
      alignItems="center"
      cursor="pointer"
      onClick={handleClick}
      onMouseDown={handlePreventDoubleClickHighlight}
      backgroundColor={
        checked
          ? colorMode === 'dark'
            ? 'blackAlpha.400'
            : 'blackAlpha.300'
          : undefined
      }
      _hover={{
        backdropFilter: !checked ? 'brightness(90%)' : undefined,
      }}
    >
      <Flex width="100%" marginLeft={1} gap={2} overflow="hidden">
        <Text flexShrink={0} flexBasis={10}>
          {`${round}.${pick}`}
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
        isChecked={checked}
        marginLeft={1}
        marginRight={2}
      />
    </Flex>
  );
};

export default DraftBoardPickRow;
