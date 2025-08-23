import {
  FormControl,
  FormLabel,
  FormHelperText,
  Stack,
  InputGroup,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { Position } from 'types';
import { positionsForFantasyList } from 'utils';

const SettingsRoster = () => {
  const { state, dispatch } = useSettings();

  const handleChange = (valueNumber: number, position: Position) => {
    if (valueNumber < 1 || valueNumber > 10) return;

    dispatch({
      type: 'set-roster-size',
      payload: {
        size: valueNumber,
        type: position,
      },
    });
  };

  return (
    <FormControl>
      <FormLabel as="span">Roster Size</FormLabel>
      <FormHelperText mb={3}>
        Number of players per position. Used to track your roster composition.
      </FormHelperText>
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
        {positionsForFantasyList.map((position, i) => {
          return (
            <NumberInput
              key={position}
              step={1}
              value={state.rosterSize[position]}
              min={1}
              max={10}
              precision={0}
              inputMode="numeric"
              onChange={(_, valueNumber) => {
                handleChange(valueNumber, position);
              }}
            >
              <InputGroup>
                <InputLeftAddon width={14}>{position}</InputLeftAddon>
                <NumberInputField
                  borderTopLeftRadius={0}
                  borderBottomLeftRadius={0}
                />
              </InputGroup>
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          );
        })}
      </SimpleGrid>
    </FormControl>
  );
};

export default SettingsRoster;
