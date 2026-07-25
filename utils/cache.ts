type CacheEntry = { value: unknown; fetchedAt: number };

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * In-memory TTL cache with in-flight dedupe. Entries live for the
 * lifetime of the server process; failures are not cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = store.get(key);
  if (entry && Date.now() - entry.fetchedAt < ttlMs) {
    return entry.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      store.set(key, { value, fetchedAt: Date.now() });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function clearCache() {
  store.clear();
  inFlight.clear();
}
