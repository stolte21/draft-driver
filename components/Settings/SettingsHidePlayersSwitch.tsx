import {
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Switch,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';

const SettingsHidePlayersSwitch = () => {
  const { state, dispatch } = useSettings();

  return (
    <FormControl>
      <Box display="flex" alignItems="center">
        <FormLabel htmlFor="hide-drafted-players" mb={0} mr={2}>
          Hide Drafted Players?
        </FormLabel>
        <Switch
          id="hide-drafted-players"
          isChecked={state.hidePlayerAfterDrafting}
          onChange={() => dispatch({ type: 'toggle-hide-player' })}
        />
      </Box>
      <FormHelperText>
        Removes players from the player list after they are drafted
      </FormHelperText>
    </FormControl>
  );
};

export default SettingsHidePlayersSwitch;
