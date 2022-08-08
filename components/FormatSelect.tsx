import { Select } from '@chakra-ui/react';
import { formatsList } from 'utils';
import { Format } from 'types';

type FormatSelectProps = {
  format: Format;
  onSelect: (format: Format) => void;
};

const formatConfig: Record<Format, string> = {
  ppr: 'PPR',
  standard: 'Standard',
  'half-ppr': 'Half PPR',
};

const FormatSelect = (props: FormatSelectProps) => (
  <Select
    value={props.format}
    onChange={(e) => props.onSelect(e.target.value as Format)}
  >
    {formatsList.map((f) => (
      <option key={f} value={f}>
        {formatConfig[f]}
      </option>
    ))}
  </Select>
);

export default FormatSelect;
