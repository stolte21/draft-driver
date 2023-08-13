import { useMemo } from 'react';
import { Grid, GridItem, useBreakpoint } from '@chakra-ui/react';
import DraftBoardList from 'components/DraftBoard/DraftBoardList';
import { useDraft } from 'providers/DraftProvider';
import useElementHeight from 'hooks/useElementHeight';

const DraftBoard = () => {
  const { state } = useDraft();
  const { element, height } = useElementHeight();
  const bp = useBreakpoint();
  const isXS = bp === 'base';

  const filteredPlayers = useMemo(
    () =>
      state.rankings.filter((player) =>
        player.name.toLowerCase().includes(state.filter)
      ),
    [state.rankings, state.filter]
  );

  const filteredDraftedPlayers = useMemo(
    () =>
      state.draftedPlayers.filter((player) =>
        player.name.toLowerCase().includes(state.filter)
      ),
    [state.draftedPlayers, state.filter]
  );

  const overallHeight = isXS ? height * 0.6 : height;
  const picksHeight = isXS ? height * 0.4 : height;

  return (
    <Grid
      ref={element}
      visibility={height === 0 ? 'hidden' : 'visible'}
      gridTemplateColumns="repeat(12, 1fr)"
      gridGap={2}
      flexGrow={1}
      overflow="hidden"
    >
      <GridItem colSpan={[12, 8]}>
        <DraftBoardList
          players={filteredPlayers}
          height={overallHeight}
          variant="rankings"
        />
      </GridItem>
      <GridItem colSpan={[12, 4]}>
        <DraftBoardList
          players={filteredDraftedPlayers}
          height={picksHeight}
          variant="picks"
        />
      </GridItem>
    </Grid>
  );
};

export default DraftBoard;
