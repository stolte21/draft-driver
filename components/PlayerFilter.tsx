import { useRef, useEffect } from 'react';
import {
  InputGroup,
  Input,
  InputRightElement,
  IconButton,
  createIcon,
} from '@chakra-ui/react';
import useDebounce from 'hooks/useDebounce';

type PlayerFilterProps = {
  filter: string;
  onChange: (filter: string) => void;
  isDisabled?: boolean;
};

const ClearIcon = createIcon({
  displayName: 'ClearIcon',
  viewBox: '0 0 24 24',
  path: (
    <path
      fill="currentColor"
      d="M.439,21.44a1.5,1.5,0,0,0,2.122,2.121L11.823,14.3a.25.25,0,0,1,.354,0l9.262,9.263a1.5,1.5,0,1,0,2.122-2.121L14.3,12.177a.25.25,0,0,1,
         0-.354l9.263-9.262A1.5,1.5,0,0,0,21.439.44L12.177,9.7a.25.25,0,0,1-.354,0L2.561.44A1.5,1.5,0,0,0,.439,2.561L9.7,11.823a.25.25,0,0,1,0,.354Z"
    />
  ),
});

const PlayerFilter = (props: PlayerFilterProps) => {
  const { value, setValue, debouncedValue } = useDebounce(props.filter);
  const stableCallback = useRef(props.onChange);

  useEffect(() => {
    stableCallback.current = props.onChange;
  });

  useEffect(() => {
    stableCallback.current(debouncedValue.toLowerCase());
  }, [debouncedValue, stableCallback]);

  return (
    <InputGroup>
      <Input
        name="player_filter"
        isDisabled={props.isDisabled}
        size={['sm', 'md']}
        placeholder="Search for players"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <InputRightElement>
          <IconButton
            aria-label="clear filter"
            icon={<ClearIcon />}
            size="xs"
            top={[-1, 0]}
            variant="ghost"
            onClick={() => setValue('')}
          />
        </InputRightElement>
      )}
    </InputGroup>
  );
};

export default PlayerFilter;
