import { useMemo } from 'react';
import { Grid, GridItem, useBreakpoint } from '@chakra-ui/react';
import DraftBoardList from 'components/DraftBoard/DraftBoardList';
import { useDraft } from 'providers/DraftProvider';
import { useSettings } from 'providers/SettingsProvider';
import useElementHeight from 'hooks/useElementHeight';

const DraftBoard = () => {
  const { state: draft, getters } = useDraft();
  const { state: settings } = useSettings();
  const { element, height } = useElementHeight();
  const bp = useBreakpoint();
  const isXS = bp === 'base';
  const hasKeepers = draft.keepers.length > 0;

  const filteredPlayers = useMemo(() => {
    const players = settings.hidePlayerAfterDrafting
      ? draft.rankings.filter(
          (player) => !getters.draftedPlayerIds.has(player.id)
        )
      : draft.rankings;

    return players
      .filter((player) => !getters.keeperPlayerIds.has(player.id))
      .filter((player) => player.name.toLowerCase().includes(draft.filter));
  }, [
    draft.rankings,
    draft.filter,
    settings.hidePlayerAfterDrafting,
    getters.draftedPlayerIds,
    getters.keeperPlayerIds,
  ]);

  const filteredDraftedPlayers = useMemo(
    () =>
      draft.draftedPlayers.filter((player) =>
        player.name.toLowerCase().includes(draft.filter)
      ),
    [draft.draftedPlayers, draft.filter]
  );

  const filteredKeepers = useMemo(
    () =>
      draft.keepers.filter((player) =>
        player.name.toLowerCase().includes(draft.filter)
      ),
    [draft.keepers, draft.filter]
  );

  const overallHeight = isXS ? height * 0.6 : height;
  let picksHeight = isXS ? height * 0.4 : height;

  if (hasKeepers) {
    picksHeight = picksHeight / 2;
  }

  return (
    <Grid
      ref={element}
      height="100%"
      visibility={height === 0 ? 'hidden' : 'visible'}
      gridTemplateColumns="repeat(12, 1fr)"
      gridGap={2}
      flexGrow={1}
      overflow="hidden"
      fontFamily={'monospace'}
      fontSize="md"
    >
      <GridItem colSpan={[12, 8]}>
        <DraftBoardList
          players={filteredPlayers}
          height={overallHeight}
          variant="rankings"
          isLoading={getters.isLoadingRankings}
        />
      </GridItem>
      <GridItem colSpan={[12, 4]}>
        <DraftBoardList
          players={filteredDraftedPlayers}
          height={picksHeight}
          variant="picks"
          isLoading={getters.isLoadingRankings}
        />
        {hasKeepers && (
          <DraftBoardList
            players={filteredKeepers}
            height={picksHeight}
            variant="keepers"
            isLoading={getters.isLoadingRankings}
          />
        )}
      </GridItem>
    </Grid>
  );
};

export default DraftBoard;
