import {
  useReducer,
  useContext,
  useEffect,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
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
  switch (action.type) {
    case 'hydrate':
      return action.payload;
    case 'increment-roster-size':
      return {
        ...state,
        rosterSize: {
          ...state.rosterSize,
          [action.payload]: state.rosterSize[action.payload] + 1,
        },
      };
    case 'decrement-roster-size':
      return {
        ...state,
        rosterSize: {
          ...state.rosterSize,
          [action.payload]: state.rosterSize[action.payload] - 1,
        },
      };
    default: {
      //@ts-expect-error
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
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

  /*
  useEffect(() => {
    const savedState = window.localStorage.getItem(
      'draft-driver__roster-settings'
    );
    if (savedState) {
      dispatch({ type: 'hydrate', payload: JSON.parse(savedState) });
    }
  }, []);*/

  useEffect(() => {
    window.localStorage.setItem(
      'draft-driver__roster-settings',
      JSON.stringify(state)
    );
  }, [state]);

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
