import { Flex, Button } from '@chakra-ui/react';
import FormatSelect from 'components/FormatSelect';
import PlayerFilter from 'components/PlayerFilter';
import { useDraft } from 'providers/DraftProvider';

const Toolbar = () => {
  const { state, dispatch } = useDraft();

  return (
    <Flex flexDirection={['column', 'row']} gap={[1, 2]} marginBottom={2}>
      <Flex flexGrow={1} gap={[1, 2]}>
        <FormatSelect
          format={state.format}
          onSelect={(f) => dispatch({ type: 'change-format', payload: f })}
        />
        <PlayerFilter
          filter={state.filter}
          onChange={(f) => dispatch({ type: 'update-filter', payload: f })}
        />
      </Flex>
      <Flex gap={[1, 2]}>
        <Button
          size={['sm', 'md']}
          disabled={state.draftedPlayers.length === 0}
          onClick={() => dispatch({ type: 'undo' })}
        >
          Undo
        </Button>
        <Button
          size={['sm', 'md']}
          disabled={state.draftedPlayers.length === 0}
          onClick={() => dispatch({ type: 'reset' })}
          color="red.500"
        >
          Reset
        </Button>
      </Flex>
    </Flex>
  );
};

export default Toolbar;
