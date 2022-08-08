import { FixedSizeList } from 'react-window';
import { Flex, Heading, Button } from '@chakra-ui/react';
import { Player, Position } from 'types';
import DraftBoardRankingRow from 'components/DraftBoard/DraftBoardRankingRow';
import DraftBoardPickRow from 'components/DraftBoard/DraftBoardPickRow';
import { useDraft } from 'providers/DraftProvider';

type DraftBoardListProps = {
  title: string;
  players: Player[];
  position?: Position;
  height: number;
  width: string;
  variant: 'rankings' | 'picks';
};

const DraftBoardList = (props: DraftBoardListProps) => {
  const { dispatch } = useDraft();

  return (
    <Flex flexDirection="column">
      <Heading
        as="h3"
        size="sm"
        padding={1}
        paddingLeft={2}
        marginBottom={1}
        textTransform="uppercase"
        rounded="md"
        backgroundColor="blackAlpha.300"
      >
        {props.title}
      </Heading>
      {props.variant === 'picks' && (
        <Flex justifyContent="space-between">
          <Button
            disabled={props.players.length === 0}
            onClick={() => dispatch({ type: 'undo' })}
          >
            Undo
          </Button>
          <Button
            disabled={props.players.length === 0}
            onClick={() => dispatch({ type: 'reset' })}
          >
            Reset
          </Button>
        </Flex>
      )}
      <FixedSizeList
        height={props.height}
        width={props.width}
        itemCount={props.players.length}
        itemSize={30}
        // some obscure players don't have a fantasy data id so fallback to the name.
        // this probably won't be an issue once trim the players based on rankings
        itemKey={(index) =>
          props.players[index].id ?? props.players[index].name
        }
        itemData={{
          players: props.players,
        }}
      >
        {props.variant === 'rankings'
          ? DraftBoardRankingRow
          : DraftBoardPickRow}
      </FixedSizeList>
    </Flex>
  );
};

export default DraftBoardList;
