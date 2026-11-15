import { describe, expect, it } from 'vitest';
import { InMemoryJobStore } from '../src/services/job-store';

describe('InMemoryJobStore', () => {
  it('retains the currently running job and the most recent finished job', () => {
    let now = 1000;
    const store = new InMemoryJobStore({ ttlMs: 10000, now: () => now });

    store.setRunning({
      jobId: 'job-1',
      mode: 'marketplace',
      status: 'running',
      progress: 'Starting...',
      startedAt: '2026-11-09T20:00:00.000Z',
      searchUrl: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=a',
    });

    expect(store.getRunning()?.jobId).toBe('job-1');
    expect(store.get('job-1')?.status).toBe('running');

    store.updateProgress('job-1', 'Scraping page 1...');
    expect(store.get('job-1')?.progress).toBe('Scraping page 1...');

    store.complete('job-1', {
      status: 'succeeded',
      finishedAt: '2026-11-09T20:00:05.000Z',
      result: {
        querySummary: 'a (limit 1)',
        resultCount: 1,
        durationMs: 5000,
        items: [{ id: '1', title: 'Bike', url: 'https://www.willhaben.at/iad/d/1/' }],
      },
    });

    expect(store.getRunning()).toBeUndefined();
    expect(store.get('job-1')?.status).toBe('succeeded');

    // Start and finish a second job; job-1 is superseded as last finished once job-2 finishes
    store.setRunning({
      jobId: 'job-2',
      mode: 'marketplace',
      status: 'running',
      progress: null,
      startedAt: '2026-11-09T20:01:00.000Z',
      searchUrl: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=b',
    });
    expect(store.get('job-1')?.status).toBe('succeeded');
    expect(store.get('job-2')?.status).toBe('running');

    store.complete('job-2', {
      status: 'failed',
      finishedAt: '2026-11-09T20:01:02.000Z',
      error: { code: 'scrape_failed', message: 'DOM changed' },
    });

    expect(store.get('job-1')).toBeUndefined();
    expect(store.get('job-2')?.status).toBe('failed');

    // Advance past TTL
    now += 10001;
    expect(store.get('job-2')).toBeUndefined();
  });

  it('returns undefined for unknown job IDs', () => {
    const store = new InMemoryJobStore({ ttlMs: 10000 });
    expect(store.get('unknown-id')).toBeUndefined();
  });
});
