import { Grid, GridItem, SimpleGrid, Button } from '@chakra-ui/react';
import DraftBoardList from 'components/DraftBoard/DraftBoardList';
import { useDraft } from 'providers/DraftProvider';
import { Position } from 'types';

const positions: Position[] = ['RB', 'WR', 'QB', 'TE'];

const DraftBoard = () => {
  const { state } = useDraft();

  const filteredPlayers = state.rankings.filter((player) =>
    player.name.toLowerCase().includes(state.filter)
  );

  return (
    <Grid gridTemplateColumns="repeat(12, 1fr)" gridGap={2}>
      <GridItem colSpan={[12, 8, 4]}>
        <DraftBoardList
          title="Overall"
          players={filteredPlayers}
          height={500}
          width="100%"
          variant="rankings"
        />
      </GridItem>
      <GridItem display={['none', 'none', 'block']} colSpan={4}>
        <SimpleGrid columns={2} gridGap={2}>
          {positions.map((position) => (
            <DraftBoardList
              key={position}
              title={position}
              players={filteredPlayers.filter((p) => p.position === position)}
              height={250}
              width="100%"
              variant="rankings"
            />
          ))}
        </SimpleGrid>
      </GridItem>
      <GridItem colSpan={[12, 4, 4]}>
        <DraftBoardList
          title="Picks"
          players={state.draftedPlayers}
          height={500}
          width="100%"
          variant="picks"
        />
      </GridItem>
    </Grid>
  );
};

export default DraftBoard;
