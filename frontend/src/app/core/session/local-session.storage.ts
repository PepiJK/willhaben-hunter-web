import { MarketplaceScrapeRequest, WillhabenItem } from '../api/willhaben-api.models';

export const SESSION_STORAGE_KEY = 'willhaben_hunter_session_v1';

export type ItemsSourceKind = 'scrape' | 'import' | null;

export interface PersistedSessionState {
  searchRequest: MarketplaceScrapeRequest;
  prompt: string;
  activeJobId: string | null;
  items: WillhabenItem[];
  sourceKind: ItemsSourceKind;
  querySummary: string | null;
  durationMs: number | null;
  searchUrl: string | null;
}

export interface SaveSessionResult {
  saved: boolean;
  quotaExceeded: boolean;
}

export function loadSessionFromStorage(
  storage: Storage | null = getSafeLocalStorage(),
): PersistedSessionState | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedSessionState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.searchRequest) {
      return null;
    }
    return {
      searchRequest: parsed.searchRequest,
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
      activeJobId: typeof parsed.activeJobId === 'string' ? parsed.activeJobId : null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sourceKind:
        parsed.sourceKind === 'scrape' || parsed.sourceKind === 'import' ? parsed.sourceKind : null,
      querySummary: typeof parsed.querySummary === 'string' ? parsed.querySummary : null,
      durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : null,
      searchUrl: typeof parsed.searchUrl === 'string' ? parsed.searchUrl : null,
    };
  } catch {
    return null;
  }
}

export function saveSessionToStorage(
  state: PersistedSessionState,
  storage: Storage | null = getSafeLocalStorage(),
): SaveSessionResult {
  if (!storage) {
    return { saved: false, quotaExceeded: false };
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    return { saved: true, quotaExceeded: false };
  } catch (err: unknown) {
    const isQuotaError =
      err instanceof Error &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    if (!isQuotaError && state.items.length === 0) {
      return { saved: false, quotaExceeded: false };
    }

    try {
      const compactState: PersistedSessionState = {
        ...state,
        items: [],
        sourceKind: null,
        querySummary: null,
        durationMs: null,
        searchUrl: state.searchUrl,
      };
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(compactState));
      return { saved: true, quotaExceeded: true };
    } catch {
      return { saved: false, quotaExceeded: true };
    }
  }
}

export function clearSessionStorage(storage: Storage | null = getSafeLocalStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

function getSafeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
