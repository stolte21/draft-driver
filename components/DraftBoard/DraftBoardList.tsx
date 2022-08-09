import { useRef } from 'react';
import { FixedSizeList } from 'react-window';
import { Flex, Heading } from '@chakra-ui/react';
import { Player, Position } from 'types';
import DraftBoardRankingRow from 'components/DraftBoard/DraftBoardRankingRow';
import DraftBoardPickRow from 'components/DraftBoard/DraftBoardPickRow';

type DraftBoardListProps = {
  title: string;
  players: Player[];
  position?: Position;
  height: number;
  variant: 'rankings' | 'picks';
};

const DraftBoardList = (props: DraftBoardListProps) => {
  // used to subtract the size of the heading from the passed in height
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <Flex flexDirection="column">
      <Heading
        ref={headingRef}
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
      <FixedSizeList
        height={props.height - (headingRef.current?.clientHeight ?? 0)}
        width="100%"
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
