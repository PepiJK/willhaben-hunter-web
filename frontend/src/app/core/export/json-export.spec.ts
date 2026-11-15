import { exportItemsAsJson, serializeItemsToJson } from './json-export';

describe('json-export', () => {
  it('serializes items to formatted JSON and triggers file download', () => {
    const items = [
      {
        id: '1',
        title: 'Bike',
        url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/bike-1/',
      },
    ];

    expect(JSON.parse(serializeItemsToJson(items))).toEqual(items);

    const createObjectURL = vi.fn(() => 'blob:json-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const filename = exportItemsAsJson(items, new Date('2026-11-09T20:00:00.000Z'));

    expect(filename).toBe('willhaben-marketplace-2026-11-09T20-00-00Z.json');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:json-url');

    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });
});
