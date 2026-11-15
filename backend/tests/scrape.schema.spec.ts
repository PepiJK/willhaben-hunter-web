import { describe, expect, it } from 'vitest';
import { WillhabenHunterArea, WillhabenHunterSortOrder } from 'willhaben-hunter';
import { MarketplaceScrapeRequestSchema } from '../src/schemas/scrape.schema';

describe('MarketplaceScrapeRequestSchema', () => {
  it('accepts valid minimal marketplace request and applies defaults', () => {
    const parsed = MarketplaceScrapeRequestSchema.parse({
      mode: 'marketplace',
      query: '  fahrrad  ',
    });

    expect(parsed).toEqual({
      mode: 'marketplace',
      query: 'fahrrad',
      limit: 25,
      skipDetails: false,
    });
  });

  it('accepts valid full marketplace request with wien and districts 1..23', () => {
    const parsed = MarketplaceScrapeRequestSchema.parse({
      mode: 'marketplace',
      query: 'rennrad',
      priceMin: 100,
      priceMax: 1500,
      area: [WillhabenHunterArea.WIEN, WillhabenHunterArea.NIEDEROESTERREICH],
      wienDistricts: [1, 7, 23],
      sort: WillhabenHunterSortOrder.PREIS_AUFSTEIGEND,
      limit: 100,
      skipDetails: false,
    });

    expect(parsed.wienDistricts).toEqual([1, 7, 23]);
    expect(parsed.limit).toBe(100);
  });

  it('rejects empty or whitespace-only query', () => {
    expect(() =>
      MarketplaceScrapeRequestSchema.parse({ mode: 'marketplace', query: '   ' }),
    ).toThrow();
    expect(() =>
      MarketplaceScrapeRequestSchema.parse({ mode: 'marketplace', query: 'a'.repeat(201) }),
    ).toThrow();
  });

  it('enforces limit caps: <= 100 with details, <= 250 with skipDetails', () => {
    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        limit: 101,
        skipDetails: false,
      }),
    ).toThrow(/100/);

    const skipOk = MarketplaceScrapeRequestSchema.parse({
      mode: 'marketplace',
      query: 'fahrrad',
      limit: 250,
      skipDetails: true,
    });
    expect(skipOk.limit).toBe(250);

    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        limit: 251,
        skipDetails: true,
      }),
    ).toThrow(/250/);

    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        limit: 0,
      }),
    ).toThrow();
  });

  it('enforces cross-field rules: priceMin <= priceMax and wienDistricts requires wien in area', () => {
    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        priceMin: 500,
        priceMax: 200,
      }),
    ).toThrow(/priceMin/);

    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        area: [WillhabenHunterArea.SALZBURG],
        wienDistricts: [1],
      }),
    ).toThrow(/wienDistricts/);

    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        wienDistricts: [1],
      }),
    ).toThrow(/wienDistricts/);

    expect(() =>
      MarketplaceScrapeRequestSchema.parse({
        mode: 'marketplace',
        query: 'fahrrad',
        area: [WillhabenHunterArea.WIEN],
        wienDistricts: [24],
      }),
    ).toThrow();
  });
});
