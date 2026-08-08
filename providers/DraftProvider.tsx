import {
  useEffect,
  useReducer,
  useContext,
  useMemo,
  createContext,
  ReactNode,
} from 'react';
import { useSettings } from 'providers/SettingsProvider';
import useRankings from 'hooks/useRankings';
import {
  getStorageItem,
  positionsList,
  flexPositionsList,
} from 'utils';
import { Player, RosteredPlayer, Position } from 'types';
import { draftReducer, State, Dispatch } from './draftReducer';

type PlayersMap = Record<string, Player>;

const DraftContext = createContext<
  | {
      state: State;
      getters: {
        isInitializing: boolean;
        isLoadingRankings: boolean;
        playersMap: PlayersMap;
        rosterByPosition: Record<Position, RosteredPlayer[]>;
        draftedPlayerIds: Set<string>;
        teamPlayerIds: Set<string>;
        favoritePlayerIds: Set<string>;
        avoidedPlayerIds: Set<string>;
        keeperPlayerIds: Set<string>;
        rankingsLastModified?: string;
      };
      dispatch: Dispatch;
    }
  | undefined
>(undefined);

const DraftProvider = (props: { children: ReactNode }) => {
  const { state: settings } = useSettings();
  const [state, dispatch] = useReducer(draftReducer, {
    isHydrated: false,
    filter: '',
    rankings: [],
    draftedPlayers: [],
    roster: [],
    favorites: [],
    avoided: [],
    notes: {},
    keepers: [],
  });

  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    state.rankings.forEach((player) => (map[player.id] = player));
    return map;
  }, [state.rankings]);

  const rosterByPosition = useMemo(() => {
    const tempRoster = state.roster.reduce(
      (group, player) => {
        const { position } = player;
        group[position].push(player);

        return group;
      },
      {
        QB: [],
        RB: [],
        WR: [],
        TE: [],
        FLX: [],
        K: [],
        DST: [],
        BN: [],
      } as Record<Position, RosteredPlayer[]>
    );

    const flexPlayers: RosteredPlayer[] = [];

    // go through and "chop off" extra players at position
    // and send them to the bench (or flex)
    positionsList.forEach((pos) => {
      tempRoster[pos].sort((a, b) => a.rank - b.rank);
      const extraPlayers = tempRoster[pos].splice(
        settings.rosterSize[pos],
        tempRoster[pos].length - settings.rosterSize[pos]
      );

      // add potential flex players to a temp list first,
      // it will have to be sorted later
      if (flexPositionsList.includes(pos)) {
        flexPlayers.push(...extraPlayers);
      } else {
        // send whatever is left to the bench
        tempRoster['BN'].push(...extraPlayers);
      }
    });

    if (flexPlayers.length > 0) {
      flexPlayers.sort((a, b) => a.rank - b.rank);
      const extraFlexPlayers = flexPlayers.splice(settings.rosterSize['FLX']);
      tempRoster['FLX'].push(...flexPlayers);
      tempRoster['BN'].push(...extraFlexPlayers);
    }

    return tempRoster;
  }, [state.roster, settings.rosterSize]);

  const draftedPlayerIds = useMemo(() => {
    return new Set(state.draftedPlayers.map((player) => player.id));
  }, [state.draftedPlayers]);

  const teamPlayerIds = useMemo(() => {
    return new Set(state.roster.map((player) => player.id));
  }, [state.roster]);

  const favoritePlayerIds = useMemo(() => {
    return new Set(state.favorites);
  }, [state.favorites]);

  const avoidedPlayerIds = useMemo(() => {
    return new Set(state.avoided);
  }, [state.avoided]);

  const keeperPlayerIds = useMemo(() => {
    return new Set(state.keepers.map((player) => player.id));
  }, [state.keepers]);

  const isInitializing = state.rankings.length === 0;

  const { data: rankingsData, isPending } = useRankings({
    isEnabled: state.isHydrated,
    format: settings.format,
  });

  useEffect(() => {
    dispatch({
      type: 'set-rankings',
      payload: {
        players: rankingsData?.players ?? [],
        lastModified: rankingsData?.lastModified,
      },
    });
  }, [rankingsData]);

  useEffect(() => {
    const savedState = getStorageItem('DRAFT');
    dispatch({ type: 'hydrate', payload: savedState });
  }, []);

  return (
    <DraftContext.Provider
      value={{
        state,
        dispatch,
        getters: {
          isInitializing,
          isLoadingRankings: isPending,
          playersMap,
          rosterByPosition,
          draftedPlayerIds,
          teamPlayerIds,
          favoritePlayerIds,
          avoidedPlayerIds,
          keeperPlayerIds,
          rankingsLastModified: state.rankingsLastModified,
        },
      }}
    >
      {props.children}
    </DraftContext.Provider>
  );
};

export const useDraft = () => {
  const context = useContext(DraftContext);

  if (context === undefined) {
    throw new Error('useDraft must be used within a DraftProvider');
  }

  return context;
};

export default DraftProvider;
