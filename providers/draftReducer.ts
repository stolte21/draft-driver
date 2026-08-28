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
  notes: Record<Player['id'], string>;
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
      payload: {
        player: Player;
        addToRoster?: { round: number; pick: number };
      };
    }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'reset-all' }
  | {
      type: 'add-roster';
      payload: { player: Player; round: number; pick: number };
    }
  | { type: 'remove-roster'; payload: string }
  | { type: 'toggle-favorite'; payload: Player['id'] }
  | { type: 'toggle-avoid'; payload: Player['id'] }
  | { type: 'set-note'; payload: { id: Player['id']; note: string } }
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
        newState.notes =
          newState.notes &&
          typeof newState.notes === 'object' &&
          !Array.isArray(newState.notes)
            ? newState.notes
            : {};
        newState.notes = Object.fromEntries(
          Object.entries(newState.notes).filter(
            ([, value]) => typeof value === 'string'
          )
        );
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
    case 'draft': {
      const { player, addToRoster } = action.payload;
      newState = {
        ...state,
        draftedPlayers: [player, ...state.draftedPlayers],
        // when it's the user's pick, roster the player in the same update
        roster: addToRoster
          ? [...state.roster, { ...player, ...addToRoster }]
          : state.roster,
      };
      break;
    }
    case 'undo': {
      const lastDrafted = state.draftedPlayers[0];

      // nothing drafted yet, so there's nothing to undo
      newState = lastDrafted
        ? {
            ...state,
            draftedPlayers: state.draftedPlayers.filter((_, i) => i !== 0),
            roster: state.roster.filter(
              (player) => player.id !== lastDrafted.id
            ),
          }
        : state;
      break;
    }
    case 'reset':
      newState = {
        ...state,
        draftedPlayers: [],
        roster: [],
      };
      break;
    case 'reset-all':
      // full reset: clear all user state but keep fetched rankings
      newState = {
        ...state,
        filter: '',
        draftedPlayers: [],
        roster: [],
        favorites: [],
        avoided: [],
        notes: {},
        keepers: [],
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
    case 'set-note': {
      const newNotes = { ...state.notes };
      const trimmedNote = action.payload.note.trim();

      if (trimmedNote === '') {
        delete newNotes[action.payload.id];
      } else {
        newNotes[action.payload.id] = trimmedNote;
      }

      newState = { ...state, notes: newNotes };
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
