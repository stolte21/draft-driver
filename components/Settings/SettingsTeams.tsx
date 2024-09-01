import {
  FormControl,
  FormLabel,
  FormHelperText,
  useNumberInput,
  Button,
  HStack,
  Text,
  Input,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';

const SettingsTeams = () => {
  const { state, dispatch } = useSettings();
  const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } =
    useNumberInput({
      step: 1,
      defaultValue: state.numTeams,
      min: 1,
      max: 32,
      precision: 0,
    });

  const inc = getIncrementButtonProps();
  const dec = getDecrementButtonProps();
  const input = getInputProps();

  return (
    <FormControl>
      <FormLabel>Teams</FormLabel>
      <FormHelperText mb={3}>
        Number of teams in the draft. For now, just used to display the correct
        pick number.
      </FormHelperText>
      <HStack justifyContent="center">
        <Button
          {...dec}
          tabIndex={0}
          size="sm"
          onClick={
            dec.disabled
              ? undefined
              : () =>
                  dispatch({
                    type: 'decrement-num-teams',
                  })
          }
        >
          -
        </Button>
        <Input {...input} tabIndex={-1} srOnly={true} />
        <Text minWidth={6} textAlign="center">
          {state.numTeams}
        </Text>
        <Button
          {...inc}
          tabIndex={0}
          size="sm"
          onClick={
            inc.disabled
              ? undefined
              : () =>
                  dispatch({
                    type: 'increment-num-teams',
                  })
          }
        >
          +
        </Button>
      </HStack>
    </FormControl>
  );
};

export default SettingsTeams;
