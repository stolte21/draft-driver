import { List, ListItem } from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { positionsList } from 'utils';

const RosterDetail = () => {
  const { state: settings } = useSettings();
  const {
    //state: draft,
    getters: { rosterByPosition },
  } = useDraft();

  return (
    <List maxWidth="container.xl" margin="auto">
      {positionsList.map((position) =>
        new Array(settings.rosterSize[position]).fill(undefined).map((_, i) => {
          const player = rosterByPosition[position][i];

          return (
            <ListItem key={player.id}>
              {position}
              {player ? rosterByPosition[position][i].name : 'Empty'}
            </ListItem>
          );
        })
      )}
    </List>
  );
};

export default RosterDetail;
