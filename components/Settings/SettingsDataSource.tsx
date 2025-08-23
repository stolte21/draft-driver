import { Select, FormControl, FormLabel } from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { dataSourcesList } from 'utils';
import { DataSource } from 'types';

const DataSourceMap: Record<DataSource, string> = {
  boris: 'Boris Chen',
  fp: 'Fantasy Pros',
};

const SettingsDataSource = () => {
  const { state, dispatch } = useSettings();

  return (
    <FormControl>
      <FormLabel>Data Source</FormLabel>
      <Select
        isDisabled
        size={['sm', 'md']}
        value={state.dataSource}
        onChange={(e) =>
          dispatch({
            type: 'change-data-source',
            payload: e.target.value as DataSource,
          })
        }
      >
        {dataSourcesList.map((dataSource) => (
          <option key={dataSource} value={dataSource}>
            {DataSourceMap[dataSource]}
          </option>
        ))}
      </Select>
    </FormControl>
  );
};

export default SettingsDataSource;
