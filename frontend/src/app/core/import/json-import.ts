import { WillhabenItem } from '../api/willhaben-api.models';

export const WILLHABEN_HTTPS_PREFIX = 'https://www.willhaben.at/';

export interface RejectedImportRow {
  index: number;
  reason: string;
}

export interface JsonImportResult {
  items: WillhabenItem[];
  rejected: RejectedImportRow[];
  parseError?: string;
}

export function isSafeWillhabenUrl(url: string | undefined): url is string {
  return typeof url === 'string' && url.startsWith(WILLHABEN_HTTPS_PREFIX);
}

function validateItem(raw: unknown, index: number): { item?: WillhabenItem; reason?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { reason: `Eintrag #${index + 1}: Objekt erwartet` };
  }

  const record = raw as Record<string, unknown>;
  const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
  if (!id) {
    return { reason: `Eintrag #${index + 1}: Pflichtfeld "id" fehlt oder ist leer` };
  }

  const title = typeof record['title'] === 'string' ? record['title'].trim() : '';
  if (!title) {
    return { reason: `Eintrag #${index + 1}: Pflichtfeld "title" fehlt oder ist leer` };
  }

  const url = typeof record['url'] === 'string' ? record['url'].trim() : '';
  if (!isSafeWillhabenUrl(url)) {
    return {
      reason: `Eintrag #${index + 1}: "url" muss mit ${WILLHABEN_HTTPS_PREFIX} beginnen`,
    };
  }

  const item: WillhabenItem = { id, title, url };
  if (typeof record['price'] === 'string' && record['price'].trim().length > 0) {
    item.price = record['price'].trim();
  }
  if (typeof record['attributes'] === 'string' && record['attributes'].trim().length > 0) {
    item.attributes = record['attributes'].trim();
  }
  if (typeof record['description'] === 'string' && record['description'].trim().length > 0) {
    item.description = record['description'].trim();
  }

  return { item };
}

export function parseImportedListingsJson(rawText: string): JsonImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      items: [],
      rejected: [],
      parseError: 'Ungültiges JSON-Format. Bitte prüfen Sie die Eingabe.',
    };
  }

  let candidateArray: unknown[] | null = null;
  if (Array.isArray(parsed)) {
    candidateArray = parsed;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { items?: unknown }).items)
  ) {
    candidateArray = (parsed as { items: unknown[] }).items;
  }

  if (!candidateArray) {
    return {
      items: [],
      rejected: [],
      parseError: 'Erwartet wurde ein Array aus Inseraten oder ein Objekt mit { "items": [...] }.',
    };
  }

  const items: WillhabenItem[] = [];
  const rejected: RejectedImportRow[] = [];

  candidateArray.forEach((entry, index) => {
    const res = validateItem(entry, index);
    if (res.item) {
      items.push(res.item);
    } else if (res.reason) {
      rejected.push({ index, reason: res.reason });
    }
  });

  return { items, rejected };
}
