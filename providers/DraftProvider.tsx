import {
  useState,
  useEffect,
  useReducer,
  useContext,
  useMemo,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
import { useSettings } from 'providers/SettingsProvider';
import {
  getStorageItem,
  setStorageItem,
  positionsList,
  flexPositionsList,
} from 'utils';
import { Player, RosteredPlayer, Position } from 'types';

type State = {
  filter: string;
  rankings: Player[];
  draftedPlayers: Player[];
  roster: RosteredPlayer[];
  favorites: Player['id'][];
};

type PlayersMap = Record<number, Player>;

type Action =
  | { type: 'hydrate'; payload: State }
  | { type: 'update-filter'; payload: string }
  | { type: 'set-rankings'; payload: Player[] }
  | {
      type: 'draft';
      payload: Player;
    }
  | { type: 'undo' }
  | { type: 'reset' }
  | {
      type: 'add-roster';
      payload: { player: Player; round: number; pick: number };
    }
  | { type: 'remove-roster'; payload: string }
  | { type: 'toggle-favorite'; payload: Player['id'] };

type Dispatch = (action: Action) => void;

const DraftContext = createContext<
  | {
      state: State;
      getters: {
        isInitializing: boolean;
        playersMap: PlayersMap;
        rosterByPosition: Record<Position, RosteredPlayer[]>;
        draftedPlayerIds: Set<string>;
        teamPlayerIds: Set<string>;
        favoritePlayerIds: Set<string>;
      };
      dispatch: Dispatch;
    }
  | undefined
>(undefined);

const draftReducer: Reducer<State, Action> = (state, action) => {
  let newState: null | State = null;

  switch (action.type) {
    case 'hydrate':
      newState = action.payload;
      newState.favorites = Array.isArray(newState.favorites)
        ? newState.favorites
        : [];

      break;
    case 'update-filter':
      newState = { ...state, filter: action.payload };
      break;
    case 'set-rankings':
      newState = { ...state, rankings: action.payload };
      break;
    case 'draft':
      newState = {
        ...state,
        draftedPlayers: [action.payload, ...state.draftedPlayers],
      };
      break;
    case 'undo':
      newState = {
        ...state,
        draftedPlayers: state.draftedPlayers.filter((_, i) => i !== 0),
        roster: state.roster.filter(
          (player) => player.id !== state.draftedPlayers[0].id
        ),
      };
      break;
    case 'reset':
      newState = {
        ...state,
        draftedPlayers: [],
        roster: [],
      };
      break;
    case 'add-roster':
      newState = {
        ...state,
        roster: [
          ...state.roster,
          {
            ...action.payload.player,
            round: action.payload.round,
            pick: action.payload.pick,
          },
        ],
      };
      break;
    case 'remove-roster':
      newState = {
        ...state,
        roster: state.roster.filter((player) => player.id !== action.payload),
      };
      break;
    case 'toggle-favorite':
      const newFavorites = [...state.favorites];
      const playerIndex = newFavorites.indexOf(action.payload);

      if (playerIndex === -1) {
        newFavorites.push(action.payload);
      } else {
        newFavorites.splice(playerIndex, 1);
      }

      newState = {
        ...state,
        favorites: newFavorites,
      };
      break;
    default: {
      //@ts-expect-error
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }

  setStorageItem('DRAFT', newState);
  return newState;
};

const DraftProvider = (props: { children: ReactNode }) => {
  const { state: settings } = useSettings();
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, dispatch] = useReducer(draftReducer, {
    filter: '',
    rankings: [],
    draftedPlayers: [],
    roster: [],
    favorites: [],
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

    // go through and "chop off" extra players at position
    // and send them to the bench (or flex)
    positionsList.forEach((pos) => {
      tempRoster[pos].sort((a, b) => a.rank - b.rank);
      const extraPlayers = tempRoster[pos].splice(
        settings.rosterSize[pos],
        tempRoster[pos].length - settings.rosterSize[pos]
      );

      // check if we can move any extra players to flex first
      if (flexPositionsList.includes(pos)) {
        const spaceInFlex =
          settings.rosterSize['FLX'] - tempRoster['FLX'].length;
        if (spaceInFlex) {
          tempRoster['FLX'].push(...extraPlayers.splice(0, spaceInFlex));
        }
      }

      // send whatever is left to the bench
      tempRoster['BN'].push(...extraPlayers);
    });

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

  const isInitializing = state.rankings.length === 0;

  useEffect(() => {
    if (isHydrated) {
      fetch(
        `/api/rankings?format=${settings.format}&src=${settings.dataSource}`
      )
        .then((response) => response.json())
        .then((r) => dispatch({ type: 'set-rankings', payload: r }));
    }
  }, [isHydrated, settings.format, settings.dataSource, dispatch]);

  useEffect(() => {
    const savedState = getStorageItem('DRAFT');

    if (savedState) {
      dispatch({ type: 'hydrate', payload: savedState });
    }

    setIsHydrated(true);
  }, []);

  return (
    <DraftContext.Provider
      value={{
        state,
        dispatch,
        getters: {
          isInitializing,
          playersMap,
          rosterByPosition,
          draftedPlayerIds,
          teamPlayerIds,
          favoritePlayerIds,
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
