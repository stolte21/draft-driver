import { ListItem, Tag, Text, Box, ThemingProps } from '@chakra-ui/react';
import { Position, RosteredPlayer } from 'types';

type RosterDetailItemProps = {
  player?: RosteredPlayer;
  position: Position;
};

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

const RosterDetailItem = (props: RosterDetailItemProps) => {
  const { player, position } = props;
  const playerName = player?.name ?? null;

  return (
    <ListItem display="flex" alignItems="center" gap={2} margin={2}>
      <Tag
        size="lg"
        width={12}
        justifyContent="center"
        colorScheme={PositionalColor[position]}
      >
        {position}
      </Tag>
      <Box display="inline-flex" alignItems="center" gap={2} flexGrow={1}>
        <Text
          fontWeight={playerName ? 'bold' : 'normal'}
          fontStyle={playerName ? 'normal' : 'italic'}
        >
          {playerName ?? 'Empty'}
        </Text>
        {player?.team && player.position !== 'DST' && (
          <Tag size="sm">{player.team}</Tag>
        )}
        {player && (position === 'BN' || position === 'FLX') && (
          <Tag size="sm" colorScheme={PositionalColor[player.position]}>
            {player.position}
          </Tag>
        )}
      </Box>
      {player?.round && (
        <Box textAlign="center">
          <Text
            fontSize="sm"
            fontWeight="bold"
          >{`${player.round}.${player.pick}`}</Text>
          <Text fontSize="xs" textColor="gray" lineHeight="0.75">
            pick
          </Text>
        </Box>
      )}
    </ListItem>
  );
};

export default RosterDetailItem;
