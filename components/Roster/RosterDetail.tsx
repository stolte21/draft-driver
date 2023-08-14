import { List, ListItem, Tag, Text, ThemingProps } from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { positionsForFantasyList } from 'utils';
import { Position } from 'types';

const PositionalColor: Partial<Record<Position, ThemingProps['colorScheme']>> =
  {
    QB: 'red',
    RB: 'green',
    WR: 'blue',
    TE: 'yellow',
    FLX: 'cyan',
    K: 'purple',
    DST: 'orange',
  };

const RosterDetail = () => {
  const { state: settings } = useSettings();
  const {
    getters: { rosterByPosition },
  } = useDraft();

  return (
    <List maxWidth="container.sm" margin="auto" paddingY={2} paddingX={4}>
      {positionsForFantasyList.map((position) =>
        new Array(settings.rosterSize[position]).fill(undefined).map((_, i) => {
          const player = rosterByPosition[position][i];
          const playerName = player ? rosterByPosition[position][i].name : null;

          return (
            <ListItem
              key={player ? player.id : `${position}_${i}`}
              display="flex"
              alignItems="center"
              gap={2}
              margin={2}
            >
              <Tag
                size="lg"
                width={12}
                justifyContent="center"
                colorScheme={PositionalColor[position]}
              >
                {position}
              </Tag>
              <Text
                fontWeight={playerName ? 'bold' : 'normal'}
                fontStyle={playerName ? 'normal' : 'italic'}
              >
                {playerName ?? 'Empty'}
              </Text>
              {player && player.team && player.position !== 'DST' && (
                <Tag size="sm">{player.team}</Tag>
              )}
              {player && position === 'BN' && (
                <Tag size="sm" colorScheme={PositionalColor[player.position]}>
                  {player.position}
                </Tag>
              )}
            </ListItem>
          );
        })
      )}
    </List>
  );
};

export default RosterDetail;
