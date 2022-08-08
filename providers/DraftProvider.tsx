import {
  useEffect,
  useReducer,
  useContext,
  useMemo,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
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
        playersMap: PlayersMap;
        draftedPlayerIds: Set<number>;
        teamPlayerIds: Set<number>;
      };
      dispatch: Dispatch;
    }
  | undefined
>(undefined);

const draftReducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case 'change-format':
      return { ...state, format: action.payload };
    case 'update-filter':
      return { ...state, filter: action.payload };
    case 'set-rankings':
      return { ...state, rankings: action.payload };
    case 'draft':
      return {
        ...state,
        draftedPlayers: [action.payload, ...state.draftedPlayers],
      };
    case 'undo':
      return {
        ...state,
        draftedPlayers: state.draftedPlayers.filter((_, i) => i !== 0),
      };
    case 'reset':
      return {
        ...state,
        draftedPlayers: [],
      };
    case 'add-roster':
      return {
        ...state,
        roster: [...state.roster, action.payload],
      };
    case 'remove-roster':
      return {
        ...state,
        roster: state.roster.filter((player) => player.id !== action.payload),
      };
    default: {
      //@ts-expect-error
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
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

  useEffect(() => {
    fetch(`/api/rankings?format=${state.format}`)
      .then((response) => response.json())
      .then((r) => dispatch({ type: 'set-rankings', payload: r }));
  }, [state.format, dispatch]);

  useEffect(() => {
    window.localStorage.setItem('draft-driver__state', JSON.stringify(state));
  }, [state]);

  return (
    <DraftContext.Provider
      value={{
        state,
        dispatch,
        computed: {
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
