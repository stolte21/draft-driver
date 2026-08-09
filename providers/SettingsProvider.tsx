import { useReducer, useContext, useEffect, createContext, ReactNode } from 'react';
import { getStorageItem } from 'utils';
import {
  settingsReducer,
  defaultState,
  State,
  Dispatch,
} from './settingsReducer';

const SettingsContext = createContext<
  { state: State; dispatch: Dispatch } | undefined
>(undefined);

const SettingsProvider = (props: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(settingsReducer, defaultState);

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
