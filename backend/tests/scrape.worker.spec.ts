import { describe, expect, it, vi } from 'vitest';
import type { WorkerOutboundMessage } from '../src/workers/scrape.worker';
import { executeWorkerMessage } from '../src/workers/scrape.worker';

describe('scrape.worker executeWorkerMessage', () => {
  it('emits progress and result IPC messages when scraper succeeds', async () => {
    const sent: WorkerOutboundMessage[] = [];
    const fakeScraper = {
      scrape: vi.fn(async (opts: { onProgress?: (msg: string) => void }) => {
        opts.onProgress?.('Scraping page 1...');
        opts.onProgress?.('Fetching details... (1/1)');
        return [
          {
            id: '123',
            title: 'Gravelbike',
            price: '€ 900',
            url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/gravelbike-123/',
          },
        ];
      }),
    };

    await executeWorkerMessage(
      {
        type: 'start',
        request: {
          mode: 'marketplace',
          query: 'gravelbike',
          limit: 5,
          skipDetails: false,
        },
      },
      (msg) => sent.push(msg),
      () => fakeScraper,
    );

    expect(sent).toEqual([
      { type: 'progress', message: 'Scraping page 1...' },
      { type: 'progress', message: 'Fetching details... (1/1)' },
      {
        type: 'result',
        items: [
          {
            id: '123',
            title: 'Gravelbike',
            price: '€ 900',
            url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/gravelbike-123/',
          },
        ],
      },
    ]);
  });

  it('emits an error IPC message when scraper throws', async () => {
    const sent: WorkerOutboundMessage[] = [];
    const fakeScraper = {
      scrape: vi.fn(async () => {
        throw new Error('Willhaben UI changed');
      }),
    };

    await executeWorkerMessage(
      {
        type: 'start',
        request: {
          mode: 'marketplace',
          query: 'fahrrad',
          limit: 3,
          skipDetails: true,
        },
      },
      (msg) => sent.push(msg),
      () => fakeScraper,
    );

    expect(sent).toEqual([{ type: 'error', message: 'Willhaben UI changed' }]);
  });
});
