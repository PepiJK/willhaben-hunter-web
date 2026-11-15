import cliExportFixture from '../../../../../contracts/fixtures/cli-export.marketplace.json';
import { isSafeWillhabenUrl, parseImportedListingsJson } from './json-import';

describe('json-import', () => {
  it('accepts plain CLI item arrays and { items } wrappers', () => {
    const plainRes = parseImportedListingsJson(JSON.stringify(cliExportFixture));
    expect(plainRes.parseError).toBeUndefined();
    expect(plainRes.rejected).toEqual([]);
    expect(plainRes.items).toHaveLength(3);

    const wrappedRes = parseImportedListingsJson(JSON.stringify({ items: cliExportFixture }));
    expect(wrappedRes.parseError).toBeUndefined();
    expect(wrappedRes.items).toHaveLength(3);
  });

  it('rejects invalid JSON or non-array payloads with parseError', () => {
    expect(parseImportedListingsJson('{not json').parseError).toBeDefined();
    expect(parseImportedListingsJson('{"foo":"bar"}').parseError).toBeDefined();
  });

  it('rejects malformed items and non-willhaben URLs with indexed reasons', () => {
    const payload = [
      'not-an-object',
      { id: '', title: 'Missing id', url: 'https://www.willhaben.at/iad/d/1/' },
      { id: '2', title: '   ', url: 'https://www.willhaben.at/iad/d/2/' },
      { id: '3', title: 'Phishing', url: 'https://evil.example/iad/d/3/' },
      {
        id: '4',
        title: 'Valid Bike',
        price: '€ 300',
        url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/valid-bike-4/',
        attributes: 'Zustand: Neu',
        description: 'Top Zustand',
      },
    ];

    const res = parseImportedListingsJson(JSON.stringify(payload));
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.id).toBe('4');
    expect(res.rejected).toHaveLength(4);
    expect(res.rejected[3]?.reason).toContain('https://www.willhaben.at/');
  });

  it('validates Willhaben-only URLs safely', () => {
    expect(isSafeWillhabenUrl('https://www.willhaben.at/iad/d/1/')).toBe(true);
    expect(isSafeWillhabenUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeWillhabenUrl('https://evil.example/')).toBe(false);
    expect(isSafeWillhabenUrl(undefined)).toBe(false);
  });
});
