import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryJobStore } from '../src/services/job-store';
import {
  ScrapeConflictError,
  ScraperService,
  type ForkFactory,
} from '../src/services/scraper.service';

class FakeChildProcess extends EventEmitter {
  pid: number;
  killed = false;
  send = vi.fn(() => true);

  constructor(pid = 4242) {
    super();
    this.pid = pid;
  }
}

describe('ScraperService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a scrape job, propagates progress, and completes on result + exit', async () => {
    const child = new FakeChildProcess(5001);
    const forkFactory: ForkFactory = vi.fn(() => child as unknown as ChildProcess);
    const jobStore = new InMemoryJobStore({ ttlMs: 1_800_000 });
    const service = new ScraperService({
      jobStore,
      scrapeTimeoutMs: 600_000,
      forkFactory,
      killProcessGroup: vi.fn(),
    });

    const accepted = service.startScrape({
      mode: 'marketplace',
      query: 'fahrrad',
      limit: 3,
      skipDetails: false,
    });

    expect(accepted.status).toBe('running');
    expect(accepted.searchUrl).toContain('keyword=fahrrad');
    expect(child.send).toHaveBeenCalledWith({
      type: 'start',
      request: {
        mode: 'marketplace',
        query: 'fahrrad',
        limit: 3,
        skipDetails: false,
      },
    });
    expect(service.isRunning()).toBe(true);

    // Second concurrent scrape is rejected with ScrapeConflictError carrying active jobId
    expect(() =>
      service.startScrape({
        mode: 'marketplace',
        query: 'tisch',
        limit: 5,
        skipDetails: true,
      }),
    ).toThrow(ScrapeConflictError);

    try {
      service.startScrape({
        mode: 'marketplace',
        query: 'tisch',
        limit: 5,
        skipDetails: true,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ScrapeConflictError);
      expect((err as ScrapeConflictError).activeJobId).toBe(accepted.jobId);
    }

    child.emit('message', { type: 'progress', message: 'Scraping page 1...' });
    expect(jobStore.get(accepted.jobId)?.progress).toBe('Scraping page 1...');

    child.emit('message', {
      type: 'result',
      items: [
        {
          id: '100',
          title: 'Citybike',
          price: '€ 150',
          url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/citybike-100/',
        },
      ],
    });
    child.emit('exit', 0, null);

    expect(service.isRunning()).toBe(false);
    const done = jobStore.get(accepted.jobId);
    expect(done?.status).toBe('succeeded');
    expect(done?.result?.resultCount).toBe(1);
    expect(done?.result?.items[0]?.id).toBe('100');
  });

  it('kills process group on timeout and holds lock until worker exit', () => {
    vi.useFakeTimers();
    const child = new FakeChildProcess(7777);
    const killProcessGroup = vi.fn();
    const jobStore = new InMemoryJobStore({ ttlMs: 1_800_000 });
    const service = new ScraperService({
      jobStore,
      scrapeTimeoutMs: 600_000,
      forkFactory: () => child as unknown as ChildProcess,
      killProcessGroup,
    });

    const accepted = service.startScrape({
      mode: 'marketplace',
      query: 'rennrad',
      limit: 25,
      skipDetails: false,
    });

    vi.advanceTimersByTime(600_000);

    expect(killProcessGroup).toHaveBeenCalledWith(7777, 'SIGKILL');
    expect(jobStore.get(accepted.jobId)?.status).toBe('timed_out');
    // Lock MUST remain held until the worker process actually exits
    expect(service.isRunning()).toBe(true);
    expect(() =>
      service.startScrape({
        mode: 'marketplace',
        query: 'gravel',
        limit: 10,
        skipDetails: true,
      }),
    ).toThrow(ScrapeConflictError);

    child.emit('exit', null, 'SIGKILL');
    expect(service.isRunning()).toBe(false);
    // Remains timed_out (not overwritten by failed)
    expect(jobStore.get(accepted.jobId)?.status).toBe('timed_out');
  });

  it('marks job as failed when worker emits error or crashes without result', () => {
    const child1 = new FakeChildProcess(1111);
    const child2 = new FakeChildProcess(2222);
    const children = [child1, child2];
    const jobStore = new InMemoryJobStore({ ttlMs: 1_800_000 });
    const service = new ScraperService({
      jobStore,
      scrapeTimeoutMs: 600_000,
      forkFactory: () => children.shift() as unknown as ChildProcess,
      killProcessGroup: vi.fn(),
    });

    const job1 = service.startScrape({
      mode: 'marketplace',
      query: 'rad',
      limit: 5,
      skipDetails: true,
    });
    child1.emit('message', { type: 'error', message: 'Selector changed' });
    child1.emit('exit', 1, null);

    expect(jobStore.get(job1.jobId)?.status).toBe('failed');
    expect(jobStore.get(job1.jobId)?.error?.message).toContain('Selector changed');
    expect(service.isRunning()).toBe(false);

    const job2 = service.startScrape({
      mode: 'marketplace',
      query: 'rad2',
      limit: 5,
      skipDetails: true,
    });
    child2.emit('exit', 137, 'SIGKILL');

    expect(jobStore.get(job2.jobId)?.status).toBe('failed');
    expect(jobStore.get(job2.jobId)?.error?.code).toBe('scrape_failed');
    expect(service.isRunning()).toBe(false);
  });

  it('kills active worker process group on shutdown', () => {
    const child = new FakeChildProcess(8888);
    const killProcessGroup = vi.fn();
    const jobStore = new InMemoryJobStore({ ttlMs: 1_800_000 });
    const service = new ScraperService({
      jobStore,
      scrapeTimeoutMs: 600_000,
      forkFactory: () => child as unknown as ChildProcess,
      killProcessGroup,
    });

    service.startScrape({
      mode: 'marketplace',
      query: 'kamera',
      limit: 5,
      skipDetails: true,
    });

    service.shutdown();
    expect(killProcessGroup).toHaveBeenCalledWith(8888, 'SIGKILL');
    child.emit('exit', null, 'SIGKILL');
    expect(service.isRunning()).toBe(false);
  });
});
