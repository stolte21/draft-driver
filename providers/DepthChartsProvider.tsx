import {
  useEffect,
  useReducer,
  useContext,
  useMemo,
  createContext,
  Reducer,
  ReactNode,
} from 'react';
import useDepthChartsQuery from 'hooks/useDepthCharts';
import { DepthChart } from 'types';

type State = {
  depthCharts: DepthChart[];
};

type Action = { type: 'set-depth-charts'; payload: DepthChart[] };
type Dispatch = (action: Action) => void;

const DepthChartsContext = createContext<
  | {
      state: State;
      getters: {
        isLoading: boolean;
      };
      dispatch: Dispatch;
    }
  | undefined
>(undefined);

const depthChartsReducer: Reducer<State, Action> = (state, action) => {
  let newState: null | State = null;

  switch (action.type) {
    case 'set-depth-charts':
      newState = { ...state, depthCharts: action.payload };
      break;
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }

  return newState;
};

const DepthChartsProvider = (props: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(depthChartsReducer, {
    depthCharts: [],
  });

  const { data: depthChartsData, isPending } = useDepthChartsQuery();

  useEffect(() => {
    dispatch({ type: 'set-depth-charts', payload: depthChartsData ?? [] });
  }, [depthChartsData]);

  return (
    <DepthChartsContext.Provider
      value={{
        state,
        dispatch,
        getters: {
          isLoading: isPending,
        },
      }}
    >
      {props.children}
    </DepthChartsContext.Provider>
  );
};

export const useDepthCharts = () => {
  const context = useContext(DepthChartsContext);

  if (context === undefined) {
    throw new Error('useDepthCharts must be used within a DepthChartsProvider');
  }

  return context;
};

export default DepthChartsProvider;
