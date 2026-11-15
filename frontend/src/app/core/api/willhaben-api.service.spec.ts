import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import analyzeFixture from '../../../../../contracts/fixtures/analyze-response.json';
import metaFixture from '../../../../../contracts/fixtures/meta.json';
import runningFixture from '../../../../../contracts/fixtures/scrape-job-running.json';
import succeededFixture from '../../../../../contracts/fixtures/scrape-job-succeeded.marketplace.json';
import { type ScrapeJob } from './willhaben-api.models';
import { WillhabenApiService } from './willhaben-api.service';

describe('WillhabenApiService', () => {
  let service: WillhabenApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WillhabenApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches meta, status, starts scrape, and calls analyze', () => {
    let metaRes: unknown;
    service.getMeta().subscribe((r) => (metaRes = r));
    httpMock.expectOne('/api/meta').flush(metaFixture);
    expect(metaRes).toEqual(metaFixture);

    let statusRes: unknown;
    service.getStatus().subscribe((r) => (statusRes = r));
    httpMock.expectOne('/api/status').flush({
      scraping: false,
      currentJobId: null,
      currentMode: null,
      currentProgress: null,
      startedAt: null,
      anthropicConfigured: true,
      model: 'claude-haiku-5-5',
    });
    expect(statusRes).toMatchObject({ anthropicConfigured: true });

    let acceptedRes: unknown;
    service
      .startScrape({ mode: 'marketplace', query: 'fahrrad', limit: 3, skipDetails: true })
      .subscribe((r) => (acceptedRes = r));
    const startReq = httpMock.expectOne('/api/scrape');
    expect(startReq.request.method).toBe('POST');
    startReq.flush({
      jobId: runningFixture.jobId,
      status: 'running',
      searchUrl: runningFixture.searchUrl,
    });
    expect(acceptedRes).toMatchObject({ jobId: runningFixture.jobId, status: 'running' });

    let analyzeRes: unknown;
    service
      .analyze({
        mode: 'marketplace',
        prompt: 'Best deal',
        items: succeededFixture.result.items,
      })
      .subscribe((r) => (analyzeRes = r));
    const analyzeReq = httpMock.expectOne('/api/analyze');
    expect(analyzeReq.request.method).toBe('POST');
    analyzeReq.flush(analyzeFixture);
    expect(analyzeRes).toEqual(analyzeFixture);
  });

  it('polls GET /api/scrape/:jobId until succeeded and completes', () => {
    vi.useFakeTimers();
    const emitted: ScrapeJob[] = [];
    let completed = false;

    service.pollScrapeJob(runningFixture.jobId, 1500).subscribe({
      next: (job) => emitted.push(job),
      complete: () => (completed = true),
    });

    // Immediate first poll (t = 0)
    vi.advanceTimersByTime(0);
    httpMock.expectOne(`/api/scrape/${runningFixture.jobId}`).flush(runningFixture);
    expect(emitted).toHaveLength(1);
    expect(completed).toBe(false);

    // Second poll after 1500ms -> terminal succeeded
    vi.advanceTimersByTime(1500);
    httpMock.expectOne(`/api/scrape/${runningFixture.jobId}`).flush(succeededFixture);
    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.status).toBe('succeeded');
    expect(completed).toBe(true);

    vi.useRealTimers();
  });
});
