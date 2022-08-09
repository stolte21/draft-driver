import { Format, Position } from 'types';

export const formatsList: Format[] = ['standard', 'half-ppr', 'ppr'];
export const positionsList: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const StorageKeyMap = {
  ROSTER_SETTINGS: 'roster-settings',
  DRAFT: 'draft',
};

const STORAGE_PREFIX = 'draft-driver__';

export const setStorageItem = (key: keyof typeof StorageKeyMap, value: any) => {
  const storageKey = `${STORAGE_PREFIX}${StorageKeyMap[key]}`;

  if (typeof window === undefined)
    throw new Error("Can't use setStorageItem in server side code.");

  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

export const getStorageItem = (key: keyof typeof StorageKeyMap) => {
  const storageKey = `${STORAGE_PREFIX}${StorageKeyMap[key]}`;

  if (typeof window === undefined)
    throw new Error("Can't use getStorageItem in server side code.");

  const value = window.localStorage.getItem(storageKey);
  return value ? JSON.parse(value) : null;
};
