import { describe, expect, it } from 'vitest';
import {
  WillhabenHunterArea,
  WillhabenHunterSortOrder,
  WillhabenHunterViennaDistrict,
} from 'willhaben-hunter';
import { marketplaceModeAdapter } from '../src/modes/marketplace.mode';
import { getModeAdapter } from '../src/modes/mode-registry';

describe('marketplaceModeAdapter & mode-registry', () => {
  it('maps district numbers 1..23 to WillhabenHunterViennaDistrict enum values', () => {
    const libOpts = marketplaceModeAdapter.toLibraryOptions({
      mode: 'marketplace',
      query: 'gravelbike',
      priceMin: 200,
      priceMax: 1200,
      area: [WillhabenHunterArea.WIEN],
      wienDistricts: [1, 7, 23],
      sort: WillhabenHunterSortOrder.NEUESTE,
      limit: 25,
      skipDetails: true,
    });

    expect(libOpts).toEqual({
      query: 'gravelbike',
      priceMin: 200,
      priceMax: 1200,
      area: [WillhabenHunterArea.WIEN],
      wienDistricts: [
        WillhabenHunterViennaDistrict.INNERE_STADT,
        WillhabenHunterViennaDistrict.NEUBAU,
        WillhabenHunterViennaDistrict.LIESING,
      ],
      sort: WillhabenHunterSortOrder.NEUESTE,
      limit: 25,
      skipDetails: true,
    });
  });

  it('builds Willhaben marketplace search URLs and human-readable query summaries', () => {
    const input = {
      mode: 'marketplace' as const,
      query: 'fahrrad',
      area: [WillhabenHunterArea.WIEN],
      limit: 3,
      skipDetails: false,
    };

    const url = marketplaceModeAdapter.buildSearchUrl(input);
    expect(url).toContain('https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?');
    expect(url).toContain('keyword=fahrrad');
    expect(url).toContain('areaId=900');

    expect(marketplaceModeAdapter.formatQuerySummary(input)).toBe('fahrrad (wien, limit 3)');
    expect(
      marketplaceModeAdapter.formatQuerySummary({
        mode: 'marketplace',
        query: 'tisch',
        limit: 25,
        skipDetails: true,
      }),
    ).toBe('tisch (limit 25)');
  });

  it('retrieves the registered marketplace adapter and creates a scraper instance', () => {
    const adapter = getModeAdapter('marketplace');
    expect(adapter.mode).toBe('marketplace');
    const scraper = adapter.createScraper();
    expect(typeof scraper.scrape).toBe('function');
  });
});
