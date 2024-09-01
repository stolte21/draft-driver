import {
  FormControl,
  FormLabel,
  FormHelperText,
  VStack,
  HStack,
  Button,
  Text,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { positionsForFantasyList } from 'utils';

const SettingsRoster = () => {
  const { state, dispatch } = useSettings();

  return (
    <FormControl>
      <FormLabel as="span">Roster Size</FormLabel>
      <FormHelperText mb={3}>
        Number of players per position. Used to track your roster composition.
      </FormHelperText>
      <VStack>
        {positionsForFantasyList.map((position, i) => {
          return (
            <HStack key={position} mb={1}>
              <Button
                tabIndex={0}
                size="sm"
                isDisabled={state.rosterSize[position] <= 0}
                onClick={() =>
                  dispatch({
                    type: 'decrement-roster-size',
                    payload: position,
                  })
                }
              >
                -
              </Button>
              <Text minWidth={12} textAlign="center">
                {state.rosterSize[position]} {position}
              </Text>
              <Button
                tabIndex={0}
                size="sm"
                isDisabled={state.rosterSize[position] >= 10}
                onClick={() =>
                  dispatch({
                    type: 'increment-roster-size',
                    payload: position,
                  })
                }
              >
                +
              </Button>
            </HStack>
          );
        })}
      </VStack>
    </FormControl>
  );
};

export default SettingsRoster;
