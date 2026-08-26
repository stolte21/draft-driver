import { Reducer } from 'react';
import { setStorageItem, formatsList, positionsForFantasyList } from 'utils';
import { Position, Format } from 'types';

export type State = {
  isHydrated: boolean;
  format: Format;
  hidePlayerAfterDrafting: boolean;
  useScarcityAdjustment: boolean;
  rosterSize: Record<Position, number>;
  numTeams: number;
  draftPosition: number | null;
};

export type Action =
  | { type: 'change-format'; payload: Format }
  | { type: 'toggle-hide-player' }
  | { type: 'toggle-scarcity-adjustment' }
  | { type: 'increment-roster-size'; payload: Position }
  | { type: 'decrement-roster-size'; payload: Position }
  | { type: 'set-roster-size'; payload: { size: number; type: Position } }
  | { type: 'increment-num-teams' }
  | { type: 'decrement-num-teams' }
  | { type: 'set-num-teams'; payload: number }
  | { type: 'set-draft-position'; payload: number | null }
  | { type: 'reset' }
  | { type: 'hydrate'; payload: State };

export type Dispatch = (action: Action) => void;

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

export const defaultState: State = {
  isHydrated: false,
  format: 'standard',
  hidePlayerAfterDrafting: true,
  useScarcityAdjustment: false,
  rosterSize: RosterSizes,
  numTeams: 10,
  draftPosition: null,
};

export const settingsReducer: Reducer<State, Action> = (state, action) => {
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

        // legacy blobs may still carry a dataSource key — drop it
        delete (action.payload as { dataSource?: unknown }).dataSource;

        action.payload.format = formatsList.includes(action.payload.format)
          ? action.payload.format
          : 'standard';

        action.payload.hidePlayerAfterDrafting =
          !!action.payload.hidePlayerAfterDrafting;
        action.payload.useScarcityAdjustment =
          !!action.payload.useScarcityAdjustment;
        action.payload.numTeams =
          isNaN(action.payload.numTeams) || action.payload.numTeams < 4
            ? 10
            : action.payload.numTeams;

        const rawDraftPosition = action.payload.draftPosition;
        action.payload.draftPosition =
          typeof rawDraftPosition === 'number' &&
          Number.isInteger(rawDraftPosition) &&
          rawDraftPosition >= 1
            ? rawDraftPosition
            : null;

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
    case 'toggle-scarcity-adjustment':
      newState = {
        ...state,
        useScarcityAdjustment: !state.useScarcityAdjustment,
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
    case 'set-draft-position':
      newState = { ...state, draftPosition: action.payload };
      break;
    case 'reset':
      newState = { ...defaultState, isHydrated: true };
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
