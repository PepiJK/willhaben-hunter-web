import { WillhabenItem } from '../api/willhaben-api.models';
import { buildExportFilename, downloadTextFile } from './csv-export';

export function serializeItemsToJson(items: readonly WillhabenItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function exportItemsAsJson(items: readonly WillhabenItem[], date?: Date): string {
  const filename = buildExportFilename('json', date);
  downloadTextFile(serializeItemsToJson(items), 'application/json;charset=utf-8', filename);
  return filename;
}
