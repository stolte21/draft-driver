const StorageKeyMap = {
  SETTINGS: 'settings',
  DRAFT: 'draft',
};

const STORAGE_PREFIX = 'draft-driver__';

export const setStorageItem = (key: keyof typeof StorageKeyMap, value: any) => {
  if (typeof window === 'undefined') return;

  const storageKey = `${STORAGE_PREFIX}${StorageKeyMap[key]}`;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

export const getStorageItem = (key: keyof typeof StorageKeyMap) => {
  if (typeof window === 'undefined') return null;

  const storageKey = `${STORAGE_PREFIX}${StorageKeyMap[key]}`;
  const value = window.localStorage.getItem(storageKey);
  return value ? JSON.parse(value) : null;
};
