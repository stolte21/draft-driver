import { List } from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import RosterDetailItem from 'components/Roster/RosterDetailItem';
import { positionsForFantasyList } from 'utils';

const RosterDetail = () => {
  const { state: settings } = useSettings();
  const {
    getters: { rosterByPosition },
  } = useDraft();

  return (
    <List
      width="100%"
      maxWidth="container.sm"
      marginLeft="auto"
      marginRight="auto"
      paddingY={2}
      paddingX={4}
      overflow="auto"
    >
      {positionsForFantasyList.map((position) =>
        new Array(settings.rosterSize[position]).fill(undefined).map((_, i) => {
          const player = rosterByPosition[position][i];

          return (
            <RosterDetailItem
              key={player?.id ?? `${position}_${i}`}
              player={player}
              position={position}
            />
          );
        })
      )}
    </List>
  );
};

export default RosterDetail;
