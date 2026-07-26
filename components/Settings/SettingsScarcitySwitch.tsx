import {
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Switch,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';

const SettingsScarcitySwitch = () => {
  const { state, dispatch } = useSettings();

  return (
    <FormControl>
      <Box display="flex" alignItems="center">
        <FormLabel htmlFor="scarcity-adjusted-rankings" mb={0} mr={2}>
          Scarcity-Adjusted Rankings?
        </FormLabel>
        <Switch
          id="scarcity-adjusted-rankings"
          isChecked={state.useScarcityAdjustment}
          onChange={() => dispatch({ type: 'toggle-scarcity-adjustment' })}
        />
      </Box>
      <FormHelperText>
        Re-orders rankings by value over replacement based on your roster
        configuration and league size (e.g. QBs rise in a 2QB league)
      </FormHelperText>
    </FormControl>
  );
};

export default SettingsScarcitySwitch;
