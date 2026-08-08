import { Reducer } from 'react';
import { setStorageItem } from 'utils';
import { Player, RosteredPlayer } from 'types';

export type State = {
  isHydrated: boolean;
  filter: string;
  rankings: Player[];
  rankingsLastModified?: string;
  draftedPlayers: Player[];
  roster: RosteredPlayer[];
  favorites: Player['id'][];
  avoided: Player['id'][];
  keepers: Player[];
};

export type Action =
  | { type: 'hydrate'; payload: State | null }
  | { type: 'update-filter'; payload: string }
  | {
      type: 'set-rankings';
      payload: { players: Player[]; lastModified?: string };
    }
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
  | { type: 'toggle-favorite'; payload: Player['id'] }
  | { type: 'toggle-avoid'; payload: Player['id'] }
  | { type: 'add-keeper'; payload: Player }
  | { type: 'remove-keeper'; payload: Player['id'] };

export type Dispatch = (action: Action) => void;

export const draftReducer: Reducer<State, Action> = (state, action) => {
  let newState: null | State = null;

  switch (action.type) {
    case 'hydrate':
      if (action.payload) {
        newState = action.payload;
        newState.favorites = Array.isArray(newState.favorites)
          ? newState.favorites
          : [];
        newState.avoided = Array.isArray(newState.avoided)
          ? newState.avoided
          : [];
        newState.draftedPlayers = Array.isArray(newState.draftedPlayers)
          ? newState.draftedPlayers
          : [];
        newState.rankings = Array.isArray(newState.rankings)
          ? newState.rankings
          : [];
        newState.roster = Array.isArray(newState.roster) ? newState.roster : [];
        newState.filter =
          typeof newState.filter === 'string' ? newState.filter : '';
        newState.keepers = Array.isArray(newState.keepers)
          ? newState.keepers
          : [];
        newState.isHydrated = true;
      } else {
        newState = { ...state, isHydrated: true };
      }

      break;
    case 'update-filter':
      newState = { ...state, filter: action.payload };
      break;
    case 'set-rankings':
      newState = {
        ...state,
        rankings: action.payload.players,
        rankingsLastModified: action.payload.lastModified,
      };
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
    case 'toggle-favorite': {
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
        avoided: state.avoided.filter((id) => id !== action.payload),
      };
      break;
    }
    case 'toggle-avoid': {
      const newAvoided = [...state.avoided];
      const playerIndex = newAvoided.indexOf(action.payload);

      if (playerIndex === -1) {
        newAvoided.push(action.payload);
      } else {
        newAvoided.splice(playerIndex, 1);
      }

      newState = {
        ...state,
        avoided: newAvoided,
        favorites: state.favorites.filter((id) => id !== action.payload),
      };
      break;
    }
    case 'add-keeper':
      newState = {
        ...state,
        keepers: [...state.keepers, action.payload].sort(
          (a, b) => a.rank - b.rank
        ),
      };
      break;
    case 'remove-keeper':
      newState = {
        ...state,
        keepers: state.keepers.filter((player) => player.id !== action.payload),
      };
      break;
    default: {
      //@ts-expect-error
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }

  // we don't want to save certain properties to local storage so make a copy and clear them out
  const stateCopy: Partial<State> = { ...newState };
  delete stateCopy.rankings;
  delete stateCopy.rankingsLastModified;
  delete stateCopy.isHydrated;

  setStorageItem('DRAFT', stateCopy);
  return newState;
};
