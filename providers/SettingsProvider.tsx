import {
  useReducer,
  useContext,
  useEffect,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
import {
  getStorageItem,
  setStorageItem,
  dataSourcesList,
  formatsList,
  positionsForFantasyList,
} from 'utils';
import { DataSource, Position, Format } from 'types';

type State = {
  isHydrated: boolean;
  format: Format;
  dataSource: DataSource;
  hidePlayerAfterDrafting: boolean;
  rosterSize: Record<Position, number>;
  numTeams: number;
};

type Action =
  | { type: 'change-format'; payload: Format }
  | { type: 'toggle-hide-player' }
  | { type: 'increment-roster-size'; payload: Position }
  | { type: 'decrement-roster-size'; payload: Position }
  | { type: 'set-roster-size'; payload: { size: number; type: Position } }
  | { type: 'increment-num-teams' }
  | { type: 'decrement-num-teams' }
  | { type: 'set-num-teams'; payload: number }
  | { type: 'change-data-source'; payload: DataSource }
  | { type: 'hydrate'; payload: State };

type Dispatch = (action: Action) => void;

const SettingsContext = createContext<
  { state: State; dispatch: Dispatch } | undefined
>(undefined);

const RosterSizes: State['rosterSize'] = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLX: 1,
  DST: 1,
  K: 1,
  BN: 6,
};

const settingsReducer: Reducer<State, Action> = (state, action) => {
  let newState: State | null = null;

  switch (action.type) {
    case 'hydrate':
      if (action.payload) {
        positionsForFantasyList.forEach((key) => {
          const position = key as keyof State['rosterSize'];
          if (
            isNaN(action.payload.rosterSize[position]) ||
            action.payload.rosterSize[position] < 0
          ) {
            action.payload.rosterSize[position] = RosterSizes[position];
          }
        });

        action.payload.dataSource = dataSourcesList.includes(
          action.payload.dataSource
        )
          ? action.payload.dataSource
          : 'boris';

        action.payload.format = formatsList.includes(action.payload.format)
          ? action.payload.format
          : 'standard';

        action.payload.hidePlayerAfterDrafting =
          !!action.payload.hidePlayerAfterDrafting;
        action.payload.numTeams =
          isNaN(action.payload.numTeams) || action.payload.numTeams < 4
            ? 10
            : action.payload.numTeams;

        newState = action.payload;
        newState.isHydrated = true;
      } else {
        newState = { ...state, isHydrated: true };
      }
      break;
    case 'change-format':
      newState = { ...state, format: action.payload };
      break;
    case 'toggle-hide-player':
      newState = {
        ...state,
        hidePlayerAfterDrafting: !state.hidePlayerAfterDrafting,
      };
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
    case 'set-roster-size':
      newState = {
        ...state,
        rosterSize: {
          ...state.rosterSize,
          [action.payload.type]: action.payload.size,
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
    case 'set-num-teams':
      newState = {
        ...state,
        numTeams: action.payload,
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

  // we don't want to save certain properties to local storage so make a copy and clear them out
  const stateCopy: Partial<State> = { ...newState };
  delete stateCopy.isHydrated;
  setStorageItem('SETTINGS', stateCopy);

  return newState;
};

const SettingsProvider = (props: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(settingsReducer, {
    isHydrated: false,
    format: 'standard',
    dataSource: 'boris',
    hidePlayerAfterDrafting: true,
    rosterSize: RosterSizes,
    numTeams: 10,
  });

  useEffect(() => {
    const savedState = getStorageItem('SETTINGS');
    dispatch({ type: 'hydrate', payload: savedState });
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
