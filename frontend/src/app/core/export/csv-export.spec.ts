import {
  buildExportFilename,
  downloadTextFile,
  escapeCsvCell,
  serializeItemsToCsv,
} from './csv-export';
import { WillhabenItem } from '../api/willhaben-api.models';

function parseRfc4180Csv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' && input[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

describe('csv-export', () => {
  it('prefixes spreadsheet formula triggers (=, +, -, @, TAB, CR) with single quote', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+123')).toBe("'+123");
    expect(escapeCsvCell('-123')).toBe("'-123");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell('\tindented')).toBe("'\tindented");
    expect(escapeCsvCell('\rcarriage')).toBe(`"'\rcarriage"`);
  });

  it('escapes commas, quotes, newlines, and umlauts and round-trips through an RFC 4180 parser', () => {
    const items: WillhabenItem[] = [
      {
        id: '911861422',
        title: 'Gravelbike "Pro", Größe 54',
        price: '€ 1.250',
        url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/gravelbike-911861422/',
        attributes: 'Zustand: Gebraucht | Größe: L',
        description: 'Erste Zeile,\nZweite Zeile mit "Anführungszeichen" und Umlauten: äöüß',
      },
      {
        id: '816861100',
        title: 'Ohne Beschreibung',
        url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/ohne-816861100/',
      },
    ];

    const csv = serializeItemsToCsv(items);
    const parsed = parseRfc4180Csv(csv);

    expect(parsed[0]).toEqual(['id', 'title', 'price', 'url', 'attributes', 'description']);
    expect(parsed[1]).toEqual([
      items[0].id,
      items[0].title,
      items[0].price,
      items[0].url,
      items[0].attributes,
      items[0].description,
    ]);
    expect(parsed[2]).toEqual([items[1].id, items[1].title, '', items[1].url, '', '']);
  });

  it('builds deterministic export filenames and triggers browser download', () => {
    const fname = buildExportFilename('csv', new Date('2026-11-09T20:15:30.123Z'));
    expect(fname).toBe('willhaben-marketplace-2026-11-09T20-15-30Z.csv');

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadTextFile('a,b', 'text/csv', fname);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });
});
