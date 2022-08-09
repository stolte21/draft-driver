import {
  useEffect,
  useReducer,
  useContext,
  useMemo,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
import { getStorageItem, setStorageItem } from 'utils';
import { Format, Player } from 'types';

type State = {
  format: Format;
  filter: string;
  rankings: Player[];
  draftedPlayers: Player[];
  roster: Player[];
};

type PlayersMap = Record<number, Player>;

type Action =
  | { type: 'hydrate'; payload: State }
  | { type: 'change-format'; payload: Format }
  | { type: 'update-filter'; payload: string }
  | { type: 'set-rankings'; payload: Player[] }
  | {
      type: 'draft';
      payload: Player;
    }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'add-roster'; payload: Player }
  | { type: 'remove-roster'; payload: number };

type Dispatch = (action: Action) => void;

const DraftContext = createContext<
  | {
      state: State;
      computed: {
        isInitializing: boolean;
        playersMap: PlayersMap;
        draftedPlayerIds: Set<number>;
        teamPlayerIds: Set<number>;
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
      break;
    case 'change-format':
      newState = { ...state, format: action.payload };
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
        roster: [...state.roster, action.payload],
      };
      break;
    case 'remove-roster':
      newState = {
        ...state,
        roster: state.roster.filter((player) => player.id !== action.payload),
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
  const [state, dispatch] = useReducer(draftReducer, {
    format: 'standard',
    filter: '',
    rankings: [],
    draftedPlayers: [],
    roster: [],
  });

  const playersMap = useMemo(() => {
    const map: Record<number, Player> = {};
    state.rankings.forEach((player) => (map[player.id] = player));
    return map;
  }, [state.rankings]);

  const draftedPlayerIds = useMemo(() => {
    return new Set(state.draftedPlayers.map((player) => player.id));
  }, [state.draftedPlayers]);

  const teamPlayerIds = useMemo(() => {
    return new Set(state.roster.map((player) => player.id));
  }, [state.roster]);

  const isInitializing = state.rankings.length === 0;

  useEffect(() => {
    fetch(`/api/rankings?format=${state.format}`)
      .then((response) => response.json())
      .then((r) => dispatch({ type: 'set-rankings', payload: r }));
  }, [state.format, dispatch]);

  useEffect(() => {
    const savedState = getStorageItem('DRAFT');

    if (savedState) {
      dispatch({ type: 'hydrate', payload: savedState });
    }
  }, []);

  return (
    <DraftContext.Provider
      value={{
        state,
        dispatch,
        computed: {
          isInitializing,
          playersMap,
          draftedPlayerIds,
          teamPlayerIds,
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
