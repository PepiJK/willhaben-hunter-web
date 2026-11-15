import { describe, expect, it } from 'vitest';
import {
  AnalysisBudgetExceededError,
  MAX_FIELD_CHARS,
  prepareAnalysisInput,
} from '../src/services/analysis-input';

describe('prepareAnalysisInput', () => {
  it('truncates description and attributes to 1500 chars and omits empty optional fields', () => {
    const longDesc = 'd'.repeat(MAX_FIELD_CHARS + 250);
    const longAttr = 'a'.repeat(MAX_FIELD_CHARS + 100);

    const prepared = prepareAnalysisInput(
      [
        {
          id: '1',
          title: 'Bike',
          price: '   ',
          url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/bike-1/',
          description: longDesc,
          attributes: longAttr,
        },
        {
          id: '2',
          title: 'Helmet',
          price: '€ 25',
          url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/helmet-2/',
          description: '',
          attributes: 'Zustand: Neu',
        },
      ],
      200_000,
    );

    expect(prepared.truncatedFields).toBe(2);
    expect(prepared.items[0]?.description?.length).toBe(MAX_FIELD_CHARS);
    expect(prepared.items[0]?.attributes?.length).toBe(MAX_FIELD_CHARS);
    expect(prepared.items[0]?.price).toBeUndefined();
    expect(prepared.items[1]?.description).toBeUndefined();
    expect(prepared.items[1]?.price).toBe('€ 25');
  });

  it('throws AnalysisBudgetExceededError with maxItemsHint when serialized payload exceeds budget', () => {
    const items = Array.from({ length: 10 }, (_, idx) => ({
      id: String(idx + 1),
      title: `Listing ${idx + 1}`,
      price: '€ 100',
      url: `https://www.willhaben.at/iad/kaufen-und-verkaufen/d/item-${idx + 1}/`,
      description: 'x'.repeat(500),
    }));

    expect(() => prepareAnalysisInput(items, 1200)).toThrow(AnalysisBudgetExceededError);
    try {
      prepareAnalysisInput(items, 1200);
    } catch (err) {
      expect(err).toBeInstanceOf(AnalysisBudgetExceededError);
      expect((err as AnalysisBudgetExceededError).maxItemsHint).toBeGreaterThanOrEqual(1);
      expect((err as AnalysisBudgetExceededError).maxItemsHint).toBeLessThan(10);
    }
  });
});
