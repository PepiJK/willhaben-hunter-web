import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import analyzeFixture from '../../../../../contracts/fixtures/analyze-response.json';
import metaFixture from '../../../../../contracts/fixtures/meta.json';
import runningFixture from '../../../../../contracts/fixtures/scrape-job-running.json';
import succeededFixture from '../../../../../contracts/fixtures/scrape-job-succeeded.marketplace.json';
import { type ScrapeJob } from '../api/willhaben-api.models';
import { WillhabenApiService } from '../api/willhaben-api.service';
import { SESSION_STORAGE_KEY } from './local-session.storage';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('re-attaches to persisted activeJobId on initialize and loads completed items', async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        searchRequest: { mode: 'marketplace', query: 'fahrrad', limit: 3, skipDetails: false },
        prompt: 'Best price',
        activeJobId: runningFixture.jobId,
        items: [],
        sourceKind: null,
        querySummary: null,
        durationMs: null,
        searchUrl: runningFixture.searchUrl,
      }),
    );

    const apiMock = {
      getMeta: vi.fn(() => of(metaFixture)),
      getStatus: vi.fn(() =>
        of({
          scraping: true,
          currentJobId: runningFixture.jobId,
          currentMode: 'marketplace' as const,
          currentProgress: 'Scraping page 1...',
          startedAt: runningFixture.startedAt,
          anthropicConfigured: true,
          model: 'claude-haiku-5-5',
        }),
      ),
      pollScrapeJob: vi.fn(() => of(runningFixture as ScrapeJob, succeededFixture as ScrapeJob)),
      startScrape: vi.fn(),
      analyze: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: WillhabenApiService, useValue: apiMock }],
    });
    const store = TestBed.inject(SessionStore);
    await store.initialize();

    expect(apiMock.pollScrapeJob).toHaveBeenCalledWith(runningFixture.jobId, 1500);
    expect(store.items()).toHaveLength(3);
    expect(store.sourceKind()).toBe('scrape');
    expect(store.activeJobId()).toBeNull();
  });

  it('starts a scrape (202), updates request/prompt, and handles 404/network polling errors', async () => {
    const apiMock = {
      getMeta: vi.fn(() => of(metaFixture)),
      getStatus: vi.fn(() =>
        of({
          scraping: false,
          currentJobId: null,
          currentMode: null,
          currentProgress: null,
          startedAt: null,
          anthropicConfigured: false,
          model: 'claude-haiku-5-5',
        }),
      ),
      startScrape: vi.fn(() =>
        of({
          jobId: 'job-202',
          status: 'running' as const,
          searchUrl: runningFixture.searchUrl,
        }),
      ),
      pollScrapeJob: vi
        .fn()
        .mockReturnValueOnce(of(succeededFixture as ScrapeJob))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })))
        .mockReturnValueOnce(throwError(() => new Error('Network dropped'))),
      analyze: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: WillhabenApiService, useValue: apiMock }],
    });
    const store = TestBed.inject(SessionStore);
    await store.initialize();

    store.updateSearchRequest({
      mode: 'marketplace',
      query: 'espresso',
      limit: 10,
      skipDetails: true,
    });
    store.updatePrompt('Check condition');
    expect(store.searchRequest().query).toBe('espresso');
    expect(store.prompt()).toBe('Check condition');

    await store.startScrape(store.searchRequest());
    expect(store.items()).toHaveLength(3);
    expect(store.isScraping()).toBe(false);

    store.attachToJob('expired-job');
    expect(store.activeJobId()).toBeNull();

    store.attachToJob('broken-job');
    expect(store.errorBanner()).toContain('Network dropped');
  });

  it('re-attaches on 409 conflict and handles failed/timed_out jobs and analysis budget errors', async () => {
    const apiMock = {
      getMeta: vi.fn(() => of(metaFixture)),
      getStatus: vi.fn(() =>
        of({
          scraping: false,
          currentJobId: null,
          currentMode: null,
          currentProgress: null,
          startedAt: null,
          anthropicConfigured: true,
          model: 'claude-haiku-5-5',
        }),
      ),
      startScrape: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                error: 'scrape_in_progress',
                message: 'Es läuft bereits eine Suche',
                jobId: runningFixture.jobId,
              },
            }),
        ),
      ),
      pollScrapeJob: vi.fn(() =>
        of({
          ...(runningFixture as ScrapeJob),
          status: 'timed_out' as const,
          finishedAt: '2026-11-09T20:10:00.000Z',
          error: { code: 'scrape_timeout', message: 'Timed out after 10m' },
        }),
      ),
      analyze: vi
        .fn()
        .mockReturnValueOnce(of(analyzeFixture))
        .mockReturnValueOnce(
          throwError(
            () =>
              new HttpErrorResponse({
                status: 413,
                error: {
                  error: 'analysis_budget_exceeded',
                  message: 'Too large',
                  maxItemsHint: 40,
                },
              }),
          ),
        ),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: WillhabenApiService, useValue: apiMock }],
    });
    const store = TestBed.inject(SessionStore);
    await store.initialize();

    await store.startScrape({
      mode: 'marketplace',
      query: 'rad',
      limit: 25,
      skipDetails: false,
    });
    expect(apiMock.pollScrapeJob).toHaveBeenCalledWith(runningFixture.jobId, 1500);
    expect(store.errorBanner()).toContain('Timed out after 10m');

    store.importItems(succeededFixture.result.items);
    expect(store.sourceKind()).toBe('import');

    await store.runAnalysis('Bestes Preis-Leistungs-Verhältnis');
    expect(store.analysis()?.recommendations).toHaveLength(2);
    expect(store.topPickCount()).toBe(1);

    await store.runAnalysis('Too big');
    expect(store.errorBanner()).toContain('40');

    store.clearSession();
    expect(store.items()).toEqual([]);
    expect(store.analysis()).toBeNull();
  });

  it('sets errorBanner when initialize fails to load metadata', async () => {
    const apiMock = {
      getMeta: vi.fn(() => throwError(() => new Error('Backend offline'))),
      getStatus: vi.fn(() => of()),
      pollScrapeJob: vi.fn(),
      startScrape: vi.fn(),
      analyze: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: WillhabenApiService, useValue: apiMock }],
    });
    const store = TestBed.inject(SessionStore);
    await store.initialize();

    expect(store.errorBanner()).toContain('Backend offline');
    expect(store.initializing()).toBe(false);
  });
});
