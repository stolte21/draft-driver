import {
  useReducer,
  useContext,
  useEffect,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
import { getStorageItem, setStorageItem } from 'utils';
import { DataSource, Position } from 'types';

type State = {
  rosterSize: Record<Position, number>;
  numTeams: number;
  dataSource: DataSource;
};

type Action =
  | { type: 'increment-roster-size'; payload: Position }
  | { type: 'decrement-roster-size'; payload: Position }
  | { type: 'increment-num-teams' }
  | { type: 'decrement-num-teams' }
  | { type: 'change-data-source'; payload: DataSource }
  | { type: 'hydrate'; payload: State };

type Dispatch = (action: Action) => void;

const SettingsContext = createContext<
  { state: State; dispatch: Dispatch } | undefined
>(undefined);

const settingsReducer: Reducer<State, Action> = (state, action) => {
  let newState: State | null = null;

  switch (action.type) {
    case 'hydrate':
      newState = action.payload;
      break;
    case 'increment-roster-size':
      newState = {
        ...state,
        rosterSize: {
          ...state.rosterSize,
          [action.payload]: state.rosterSize[action.payload] + 1,
        },
      };
      break;
    case 'decrement-roster-size':
      newState = {
        ...state,
        rosterSize: {
          ...state.rosterSize,
          [action.payload]: state.rosterSize[action.payload] - 1,
        },
      };
      break;
    case 'increment-num-teams':
      newState = {
        ...state,
        numTeams: state.numTeams + 1,
      };
      break;
    case 'decrement-num-teams':
      newState = {
        ...state,
        numTeams: state.numTeams - 1,
      };
      break;
    case 'change-data-source':
      newState = {
        ...state,
        dataSource: action.payload,
      };
      break;
    default: {
      //@ts-expect-error
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }

  setStorageItem('SETTINGS', newState);
  return newState;
};

const SettingsProvider = (props: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(settingsReducer, {
    rosterSize: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      DST: 1,
      K: 1,
    },
    numTeams: 10,
    dataSource: 'fp',
  });

  useEffect(() => {
    const savedState = getStorageItem('SETTINGS');

    if (savedState) {
      dispatch({ type: 'hydrate', payload: savedState });
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ state, dispatch }}>
      {props.children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
};

export default SettingsProvider;
