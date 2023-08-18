import { HStack } from '@chakra-ui/react';
import RosterPositionCircle from 'components/Roster/RosterPositionCircle';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { positionsForFantasyList } from 'utils';

const RosterSummary = () => {
  const { state: settings } = useSettings();
  const {
    getters: { rosterByPosition },
  } = useDraft();

  return (
    <HStack justifyContent="center">
      {positionsForFantasyList.map((position) => (
        <RosterPositionCircle
          key={position}
          position={position}
          numPlayers={rosterByPosition[position].length}
          total={settings.rosterSize[position]}
        />
      ))}
    </HStack>
  );
};

export default RosterSummary;
