import { FormControl, FormLabel } from '@chakra-ui/react';
import FormatSelect from 'components/FormatSelect';
import { useSettings } from 'providers/SettingsProvider';

const SettingsFormat = () => {
  const { state, dispatch } = useSettings();

  return (
    <FormControl>
      <FormLabel>Scoring Format</FormLabel>
      <FormatSelect
        format={state.format}
        onSelect={(f) => dispatch({ type: 'change-format', payload: f })}
      />
    </FormControl>
  );
};

export default SettingsFormat;
