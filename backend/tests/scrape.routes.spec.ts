import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { InMemoryJobStore } from '../src/services/job-store';
import { ScraperService } from '../src/services/scraper.service';

class FakeChildProcess extends EventEmitter {
  pid = 3333;
  send = vi.fn(() => true);
}

describe('scrape and status routes', () => {
  it('supports POST /api/scrape (202/409/400), GET /api/scrape/:jobId (200/404), and GET /api/status', async () => {
    const child = new FakeChildProcess();
    const jobStore = new InMemoryJobStore({ ttlMs: 1_800_000 });
    const scraperService = new ScraperService({
      jobStore,
      scrapeTimeoutMs: 600_000,
      forkFactory: () => child as unknown as ChildProcess,
      killProcessGroup: vi.fn(),
    });

    const config = loadConfig({
      LOG_LEVEL: 'silent',
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
      ANTHROPIC_MODEL: 'claude-haiku-5-5',
    });
    const app = await buildApp({ config, jobStore, scraperService });

    // Initial status
    const status0 = await app.inject({ method: 'GET', url: '/api/status' });
    expect(status0.statusCode).toBe(200);
    expect(status0.json()).toEqual({
      scraping: false,
      currentJobId: null,
      currentMode: null,
      currentProgress: null,
      startedAt: null,
      anthropicConfigured: true,
      model: 'claude-haiku-5-5',
    });

    // Validation error -> 400
    const badRes = await app.inject({
      method: 'POST',
      url: '/api/scrape',
      payload: { mode: 'marketplace', query: 'fahrrad', limit: 101, skipDetails: false },
    });
    expect(badRes.statusCode).toBe(400);
    expect(badRes.json().error).toBe('validation_error');

    // Start scrape -> 202
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/scrape',
      payload: { mode: 'marketplace', query: 'fahrrad', limit: 3, skipDetails: true },
    });
    expect(startRes.statusCode).toBe(202);
    const accepted = startRes.json() as { jobId: string; status: string; searchUrl: string };
    expect(accepted.status).toBe('running');
    expect(accepted.searchUrl).toContain('keyword=fahrrad');

    // Progress + status while running
    child.emit('message', { type: 'progress', message: 'Scraping page 1...' });
    const statusRunning = await app.inject({ method: 'GET', url: '/api/status' });
    expect(statusRunning.json()).toMatchObject({
      scraping: true,
      currentJobId: accepted.jobId,
      currentMode: 'marketplace',
      currentProgress: 'Scraping page 1...',
    });

    // Concurrent POST -> 409 with active jobId
    const conflictRes = await app.inject({
      method: 'POST',
      url: '/api/scrape',
      payload: { mode: 'marketplace', query: 'rad', limit: 3, skipDetails: true },
    });
    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.json()).toMatchObject({
      error: 'scrape_in_progress',
      jobId: accepted.jobId,
    });

    // Finish job
    child.emit('message', {
      type: 'result',
      items: [
        {
          id: '123',
          title: 'Trekkingrad',
          price: '€ 250',
          url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/trekkingrad-123/',
        },
      ],
    });
    child.emit('exit', 0, null);

    // Poll finished job
    const jobRes = await app.inject({ method: 'GET', url: `/api/scrape/${accepted.jobId}` });
    expect(jobRes.statusCode).toBe(200);
    expect(jobRes.json()).toMatchObject({
      jobId: accepted.jobId,
      mode: 'marketplace',
      status: 'succeeded',
      result: {
        resultCount: 1,
      },
    });

    // Unknown job -> 404
    const notFoundRes = await app.inject({ method: 'GET', url: '/api/scrape/nonexistent' });
    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.json().error).toBe('not_found');

    await app.close();
  });
});
