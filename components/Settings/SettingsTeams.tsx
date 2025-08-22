import {
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';

const SettingsTeams = () => {
  const { state, dispatch } = useSettings();

  const handleChange = (_: string, valueNumber: number) => {
    const newValue = isNaN(valueNumber) ? state.numTeams : valueNumber;
    if (newValue !== state.numTeams) {
      dispatch({
        type: 'set-num-teams',
        payload: newValue,
      });
    }
  };

  return (
    <FormControl display="flex" alignItems="center" gap={2}>
      <div>
        <FormLabel>Teams</FormLabel>
        <FormHelperText>
          Number of teams in the draft. For now, just used to display the
          correct pick number.
        </FormHelperText>
      </div>
      <NumberInput
        step={1}
        value={state.numTeams}
        min={1}
        max={32}
        precision={0}
        onChange={handleChange}
        inputMode="numeric"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FormControl>
  );
};

export default SettingsTeams;
