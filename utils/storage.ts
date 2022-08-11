const StorageKeyMap = {
  SETTINGS: 'settings',
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
