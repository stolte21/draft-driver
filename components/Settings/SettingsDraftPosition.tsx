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

const SettingsDraftPosition = () => {
  const { state, dispatch } = useSettings();

  const handleChange = (_: string, valueNumber: number) => {
    if (isNaN(valueNumber) || valueNumber < 0 || valueNumber > state.numTeams)
      return;

    dispatch({
      type: 'set-draft-position',
      payload: valueNumber === 0 ? null : valueNumber,
    });
  };

  return (
    <FormControl display="flex" alignItems="center" gap={2}>
      <div>
        <FormLabel>Your Draft Position</FormLabel>
        <FormHelperText>
          Your first-round pick slot in a snake draft. Highlights the app when
          you are on the clock and adds your pick to your roster. Set to 0 to
          turn off.
        </FormHelperText>
      </div>
      <NumberInput
        step={1}
        value={state.draftPosition ?? 0}
        min={0}
        max={state.numTeams}
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

export default SettingsDraftPosition;
