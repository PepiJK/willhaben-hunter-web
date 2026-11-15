import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  AnalyzeResponse,
  ApiErrorPayload,
  MarketplaceScrapeRequest,
  MetaResponse,
  ScrapeJob,
  StatusResponse,
  WillhabenItem,
} from '../api/willhaben-api.models';
import { WillhabenApiService } from '../api/willhaben-api.service';
import {
  ItemsSourceKind,
  clearSessionStorage,
  loadSessionFromStorage,
  saveSessionToStorage,
} from './local-session.storage';

export function createDefaultSearchRequest(): MarketplaceScrapeRequest {
  return {
    mode: 'marketplace',
    query: '',
    limit: 25,
    skipDetails: false,
  };
}

const DEFAULT_PROMPT = 'Bestes Preis-Leistungs-Verhältnis';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(WillhabenApiService);
  private readonly destroyRef = inject(DestroyRef);
  private pollSub: Subscription | null = null;

  readonly meta = signal<MetaResponse | null>(null);
  readonly status = signal<StatusResponse | null>(null);
  readonly searchRequest = signal<MarketplaceScrapeRequest>(createDefaultSearchRequest());
  readonly prompt = signal<string>(DEFAULT_PROMPT);
  readonly activeJobId = signal<string | null>(null);
  readonly activeJob = signal<ScrapeJob | null>(null);
  readonly items = signal<WillhabenItem[]>([]);
  readonly sourceKind = signal<ItemsSourceKind>(null);
  readonly querySummary = signal<string | null>(null);
  readonly durationMs = signal<number | null>(null);
  readonly searchUrl = signal<string | null>(null);
  readonly analysis = signal<AnalyzeResponse | null>(null);

  readonly initializing = signal<boolean>(false);
  readonly analyzing = signal<boolean>(false);
  readonly errorBanner = signal<string | null>(null);
  readonly infoNotice = signal<string | null>(null);
  readonly quotaWarning = signal<boolean>(false);

  readonly isScraping = computed(() => {
    const job = this.activeJob();
    if (job?.status === 'running') {
      return true;
    }
    return this.status()?.scraping ?? false;
  });

  readonly currentProgress = computed(() => {
    return this.activeJob()?.progress ?? this.status()?.currentProgress ?? null;
  });

  readonly anthropicConfigured = computed(() => this.status()?.anthropicConfigured ?? false);
  readonly modelName = computed(() => this.status()?.model ?? 'claude-haiku-5-5');

  readonly topPickCount = computed(() => {
    const res = this.analysis();
    if (!res) {
      return 0;
    }
    return res.recommendations.filter((r) => r.verdict === 'top-pick').length;
  });

  constructor() {
    this.restoreFromStorage();
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  async initialize(): Promise<void> {
    this.initializing.set(true);
    this.errorBanner.set(null);

    try {
      const [meta, status] = await Promise.all([
        firstValueFrom(this.api.getMeta()),
        firstValueFrom(this.api.getStatus()),
      ]);
      this.meta.set(meta);
      this.status.set(status);

      const jobToAttach = this.activeJobId() ?? (status.scraping ? status.currentJobId : null);
      if (jobToAttach) {
        this.attachToJob(jobToAttach);
      }
    } catch (err: unknown) {
      this.errorBanner.set(
        this.extractErrorMessage(err, 'Backend-Metadaten konnten nicht geladen werden.'),
      );
    } finally {
      this.initializing.set(false);
    }
  }

  updateSearchRequest(next: MarketplaceScrapeRequest): void {
    this.searchRequest.set(next);
    this.persist();
  }

  updatePrompt(nextPrompt: string): void {
    this.prompt.set(nextPrompt);
    this.persist();
  }

  async startScrape(request: MarketplaceScrapeRequest): Promise<void> {
    this.errorBanner.set(null);
    this.infoNotice.set(null);
    this.searchRequest.set(request);
    this.persist();

    try {
      const accepted = await firstValueFrom(this.api.startScrape(request));
      this.activeJobId.set(accepted.jobId);
      this.searchUrl.set(accepted.searchUrl);
      this.activeJob.set({
        jobId: accepted.jobId,
        mode: 'marketplace',
        status: 'running',
        progress: 'Scraping gestartet…',
        startedAt: new Date().toISOString(),
        searchUrl: accepted.searchUrl,
      });
      this.persist();
      this.attachToJob(accepted.jobId);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        const body = err.error as Partial<ApiErrorPayload> | null;
        const conflictJobId = body?.jobId;
        this.infoNotice.set(
          body?.message ?? 'Es läuft bereits eine Suche. Laufender Job wird verbunden…',
        );
        if (conflictJobId) {
          this.activeJobId.set(conflictJobId);
          this.persist();
          this.attachToJob(conflictJobId);
        }
        return;
      }

      this.errorBanner.set(this.extractErrorMessage(err, 'Suche konnte nicht gestartet werden.'));
    }
  }

  attachToJob(jobId: string, intervalMs = 1500): void {
    this.stopPolling();
    this.activeJobId.set(jobId);

    this.pollSub = this.api.pollScrapeJob(jobId, intervalMs).subscribe({
      next: (job) => {
        this.activeJob.set(job);
        this.searchUrl.set(job.searchUrl);

        if (job.status === 'succeeded' && job.result) {
          this.items.set(job.result.items);
          this.sourceKind.set('scrape');
          this.querySummary.set(job.result.querySummary);
          this.durationMs.set(job.result.durationMs);
          this.analysis.set(null);
          this.activeJobId.set(null);
          this.status.update((prev) =>
            prev ? { ...prev, scraping: false, currentJobId: null, currentProgress: null } : prev,
          );
          this.persist();
        } else if (job.status === 'failed' || job.status === 'timed_out') {
          this.errorBanner.set(
            job.error?.message ??
              (job.status === 'timed_out'
                ? 'Suche wurde nach 10 Minuten abgebrochen (Timeout).'
                : 'Suche fehlgeschlagen.'),
          );
          this.activeJobId.set(null);
          this.status.update((prev) =>
            prev ? { ...prev, scraping: false, currentJobId: null, currentProgress: null } : prev,
          );
          this.persist();
        }
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.activeJobId.set(null);
          this.activeJob.set(null);
          this.persist();
          return;
        }
        this.errorBanner.set(
          this.extractErrorMessage(err, 'Job-Status konnte nicht abgerufen werden.'),
        );
      },
    });
  }

  importItems(items: WillhabenItem[]): void {
    this.errorBanner.set(null);
    this.infoNotice.set(`${items.length} Inserat(e) aus JSON importiert.`);
    this.items.set(items);
    this.sourceKind.set('import');
    this.querySummary.set(`JSON Import (${items.length} Inserate)`);
    this.durationMs.set(null);
    this.analysis.set(null);
    this.persist();
  }

  async runAnalysis(promptText: string): Promise<void> {
    const currentItems = this.items();
    if (currentItems.length === 0 || this.analyzing()) {
      return;
    }

    this.errorBanner.set(null);
    this.infoNotice.set(null);
    this.prompt.set(promptText);
    this.analyzing.set(true);
    this.persist();

    try {
      const response = await firstValueFrom(
        this.api.analyze({
          mode: 'marketplace',
          prompt: promptText,
          items: currentItems,
        }),
      );
      this.analysis.set(response);
    } catch (err: unknown) {
      this.errorBanner.set(this.extractErrorMessage(err, 'KI-Analyse fehlgeschlagen.'));
    } finally {
      this.analyzing.set(false);
    }
  }

  clearSession(): void {
    this.stopPolling();
    clearSessionStorage();
    this.searchRequest.set(createDefaultSearchRequest());
    this.prompt.set(DEFAULT_PROMPT);
    this.activeJobId.set(null);
    this.activeJob.set(null);
    this.items.set([]);
    this.sourceKind.set(null);
    this.querySummary.set(null);
    this.durationMs.set(null);
    this.searchUrl.set(null);
    this.analysis.set(null);
    this.errorBanner.set(null);
    this.infoNotice.set(null);
    this.quotaWarning.set(false);
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private restoreFromStorage(): void {
    const saved = loadSessionFromStorage();
    if (!saved) {
      return;
    }
    this.searchRequest.set(saved.searchRequest);
    if (saved.prompt) {
      this.prompt.set(saved.prompt);
    }
    this.activeJobId.set(saved.activeJobId);
    this.items.set(saved.items);
    this.sourceKind.set(saved.sourceKind);
    this.querySummary.set(saved.querySummary);
    this.durationMs.set(saved.durationMs);
    this.searchUrl.set(saved.searchUrl);
  }

  private persist(): void {
    const res = saveSessionToStorage({
      searchRequest: this.searchRequest(),
      prompt: this.prompt(),
      activeJobId: this.activeJobId(),
      items: this.items(),
      sourceKind: this.sourceKind(),
      querySummary: this.querySummary(),
      durationMs: this.durationMs(),
      searchUrl: this.searchUrl(),
    });
    this.quotaWarning.set(res.quotaExceeded);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const payload = err.error as Partial<ApiErrorPayload> | null;
      if (payload?.error === 'analysis_budget_exceeded' && payload.maxItemsHint) {
        return `Analyse-Budget überschritten. Bitte maximal ca. ${payload.maxItemsHint} Inserate auswählen.`;
      }
      if (payload?.message) {
        return payload.message;
      }
      if (err.message) {
        return err.message;
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }
}
