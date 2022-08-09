import {
  useReducer,
  useContext,
  useEffect,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
import { getStorageItem, setStorageItem } from 'utils';
import { Position } from 'types';

type State = {
  rosterSize: Record<Position, number>;
};

type Action =
  | { type: 'increment-roster-size'; payload: Position }
  | { type: 'decrement-roster-size'; payload: Position }
  | { type: 'hydrate'; payload: State };

type Dispatch = (action: Action) => void;

const RosterSettingsContext = createContext<
  { state: State; dispatch: Dispatch } | undefined
>(undefined);

const rosterSettingsReducer: Reducer<State, Action> = (state, action) => {
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
    default: {
      //@ts-expect-error
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }

  setStorageItem('ROSTER_SETTINGS', newState);
  return newState;
};

const RosterSettingsProvider = (props: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(rosterSettingsReducer, {
    rosterSize: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      DEF: 1,
      K: 1,
    },
  });

  useEffect(() => {
    const savedState = getStorageItem('ROSTER_SETTINGS');

    if (savedState) {
      dispatch({ type: 'hydrate', payload: savedState });
    }
  }, []);

  return (
    <RosterSettingsContext.Provider value={{ state, dispatch }}>
      {props.children}
    </RosterSettingsContext.Provider>
  );
};

export const useRosterSettings = () => {
  const context = useContext(RosterSettingsContext);

  if (context === undefined) {
    throw new Error(
      'useRosterSettings must be used within a RosterSettingsProvider'
    );
  }

  return context;
};

export default RosterSettingsProvider;
