import {
  IconButton,
  createIcon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Box,
  VStack,
  Flex,
  Text,
  Button,
  Divider,
  Select,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { positionsForFantasyList, dataSourcesList } from 'utils';
import { DataSource } from 'types';

const SettingsIcon = createIcon({
  displayName: 'SettingsIcon',
  viewBox: '0 0 14 14',
  path: (
    <path
      fill="currentColor"
      d="M14,7.77 L14,6.17 L12.06,5.53 L11.61,4.44 L12.49,2.6 L11.36,1.47 L9.55,2.38 L8.46,1.93 L7.77,0.01 L6.17,0.01 L5.54,1.95 L4.43,2.4 L2.59,1.52 L1.46,2.65 L2.37,4.46 L1.92,5.55 L0,6.23 L0,7.82 L1.94,8.46 L2.39,9.55 L1.51,11.39 L2.64,12.52 L4.45,11.61 L5.54,12.06 L6.23,13.98 L7.82,13.98 L8.45,12.04 L9.56,11.59 L11.4,12.47 L12.53,11.34 L11.61,9.53 L12.08,8.44 L14,7.75 L14,7.77 Z M7,10 C5.34,10 4,8.66 4,7 C4,5.34 5.34,4 7,4 C8.66,4 10,5.34 10,7 C10,8.66 8.66,10 7,10 Z"
    ></path>
  ),
});

const DataSourceMap: Record<DataSource, string> = {
  boris: 'Boris Chen',
  fp: 'Fantasy Pros',
};

const SettingsButton = () => {
  const { state, dispatch } = useSettings();

  const renderTeamSettings = () => (
    <>
      <Text marginBottom={2}>Teams</Text>
      <Flex justifyContent="center" alignItems="center" gap={4}>
        <Button
          size="sm"
          rounded="full"
          variant="outline"
          disabled={state.numTeams <= 6}
          onClick={() =>
            dispatch({
              type: 'decrement-num-teams',
            })
          }
        >
          -
        </Button>
        <Text textAlign="center" width={16}>
          {state.numTeams}
        </Text>
        <Button
          size="sm"
          rounded="full"
          variant="outline"
          disabled={state.numTeams >= 16}
          onClick={() =>
            dispatch({
              type: 'increment-num-teams',
            })
          }
        >
          +
        </Button>
      </Flex>
    </>
  );

  const renderDraftSettings = () => (
    <>
      <Text marginBottom={2}>Roster Size</Text>
      <VStack>
        {positionsForFantasyList.map((position) => (
          <Flex key={position} alignItems="center" gap={4}>
            <Button
              size="sm"
              rounded="full"
              variant="outline"
              disabled={state.rosterSize[position] <= 0}
              onClick={() =>
                dispatch({
                  type: 'decrement-roster-size',
                  payload: position,
                })
              }
            >
              -
            </Button>
            <Text textAlign="center" width={16}>
              {state.rosterSize[position]} {position}
            </Text>
            <Button
              size="sm"
              rounded="full"
              variant="outline"
              disabled={state.rosterSize[position] >= 3}
              onClick={() =>
                dispatch({
                  type: 'increment-roster-size',
                  payload: position,
                })
              }
            >
              +
            </Button>
          </Flex>
        ))}
      </VStack>
    </>
  );

  const renderDataSourceSettings = () => {
    return (
      <>
        <Text marginBottom={2}>Data Source</Text>
        <Select
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
      </>
    );
  };

  return (
    <Popover placement="bottom-start">
      <PopoverTrigger>
        <IconButton
          aria-label="settings"
          variant="ghost"
          icon={<SettingsIcon />}
        />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverCloseButton right={1} />
        <PopoverHeader>Settings</PopoverHeader>
        <PopoverBody>
          <Box marginBottom={2}>{renderTeamSettings()}</Box>
          <Divider marginTop={4} marginBottom={2} />
          <Box>{renderDraftSettings()}</Box>
          <Divider marginTop={4} marginBottom={2} />
          <Box>{renderDataSourceSettings()}</Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default SettingsButton;
