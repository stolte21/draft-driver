import { HStack } from '@chakra-ui/react';
import RosterPositionCircle from 'components/Roster/RosterPositionCircle';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { positionsList } from 'utils';

const RosterSummary = () => {
  const { state: settings } = useSettings();
  const {
    getters: { rosterByPosition },
  } = useDraft();

  return (
    <HStack justifyContent="center" marginBottom={2}>
      {positionsList.map((position) => (
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
