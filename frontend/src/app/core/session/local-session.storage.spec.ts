import {
  SESSION_STORAGE_KEY,
  clearSessionStorage,
  loadSessionFromStorage,
  saveSessionToStorage,
  type PersistedSessionState,
} from './local-session.storage';

function createMemoryStorage(throwQuotaOnce = false): Storage {
  const map = new Map<string, string>();
  let threw = false;

  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      if (throwQuotaOnce && !threw) {
        threw = true;
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(k, v);
    },
  };
}

describe('local-session.storage', () => {
  const baseState: PersistedSessionState = {
    searchRequest: { mode: 'marketplace', query: 'fahrrad', limit: 25, skipDetails: false },
    prompt: 'Best deal',
    activeJobId: 'job-123',
    items: [
      {
        id: '1',
        title: 'Bike',
        url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/bike-1/',
      },
    ],
    sourceKind: 'scrape',
    querySummary: 'fahrrad (limit 25)',
    durationMs: 1200,
    searchUrl: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=fahrrad',
  };

  it('saves, loads, and clears session state', () => {
    const storage = createMemoryStorage();
    expect(saveSessionToStorage(baseState, storage)).toEqual({ saved: true, quotaExceeded: false });
    expect(loadSessionFromStorage(storage)).toEqual(baseState);

    clearSessionStorage(storage);
    expect(loadSessionFromStorage(storage)).toBeNull();
  });

  it('falls back to saving search params, prompt, and activeJobId without items on QuotaExceededError', () => {
    const storage = createMemoryStorage(true);
    const result = saveSessionToStorage(baseState, storage);

    expect(result).toEqual({ saved: true, quotaExceeded: true });
    const reloaded = loadSessionFromStorage(storage);
    expect(reloaded?.searchRequest).toEqual(baseState.searchRequest);
    expect(reloaded?.prompt).toBe('Best deal');
    expect(reloaded?.activeJobId).toBe('job-123');
    expect(reloaded?.items).toEqual([]);
  });

  it('handles corrupt JSON and null storage safely', () => {
    const storage = createMemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{bad json');
    expect(loadSessionFromStorage(storage)).toBeNull();
    expect(loadSessionFromStorage(null)).toBeNull();
    expect(saveSessionToStorage(baseState, null)).toEqual({ saved: false, quotaExceeded: false });
  });
});
