import { WillhabenItem } from '../api/willhaben-api.models';

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;
const CSV_COLUMNS: readonly (keyof WillhabenItem)[] = [
  'id',
  'title',
  'price',
  'url',
  'attributes',
  'description',
];

export function escapeCsvCell(rawValue: string | undefined): string {
  const value = rawValue ?? '';
  const formulaSafe = FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function serializeItemsToCsv(items: readonly WillhabenItem[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = items.map((item) => CSV_COLUMNS.map((col) => escapeCsvCell(item[col])).join(','));
  return [header, ...rows].join('\r\n');
}

export function buildExportFilename(ext: 'csv' | 'json', date: Date = new Date()): string {
  const stamp = date
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace(/-\d{3}Z$/, 'Z');
  return `willhaben-marketplace-${stamp}.${ext}`;
}

export function downloadTextFile(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
