import { type ChildProcess, fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WillhabenHunterItem } from 'willhaben-hunter';
import { getModeAdapter } from '../modes/mode-registry';
import type { ScrapeAcceptedResponse, ScrapeJob } from '../schemas/job.schema';
import type { ScrapeRequest } from '../schemas/scrape.schema';
import type { WorkerInboundMessage, WorkerOutboundMessage } from '../workers/scrape.worker';
import { InMemoryJobStore } from './job-store';

export type ForkFactory = (modulePath: string) => ChildProcess;
export type KillProcessGroupFn = (pid: number, signal: NodeJS.Signals) => void;

export class ScrapeConflictError extends Error {
  readonly activeJobId: string;

  constructor(activeJobId: string) {
    super('Es läuft bereits eine Suche / A scrape is already running');
    this.name = 'ScrapeConflictError';
    this.activeJobId = activeJobId;
  }
}

export interface ScraperServiceOptions {
  jobStore: InMemoryJobStore;
  scrapeTimeoutMs: number;
  workerPath?: string;
  forkFactory?: ForkFactory;
  killProcessGroup?: KillProcessGroupFn;
  now?: () => number;
}

function defaultWorkerPath(): string {
  const jsWorker = resolve(__dirname, '../workers/scrape.worker.js');
  if (existsSync(jsWorker)) {
    return jsWorker;
  }
  return resolve(__dirname, '../workers/scrape.worker.ts');
}

function defaultForkFactory(modulePath: string): ChildProcess {
  const isTs = modulePath.endsWith('.ts');
  return fork(modulePath, [], {
    detached: true,
    execArgv: isTs ? ['-r', 'ts-node/register'] : undefined,
  });
}

function defaultKillProcessGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    // Process group may have already exited
  }
}

export class ScraperService {
  private readonly jobStore: InMemoryJobStore;
  private readonly scrapeTimeoutMs: number;
  private readonly workerPath: string;
  private readonly forkFactory: ForkFactory;
  private readonly killProcessGroup: KillProcessGroupFn;
  private readonly now: () => number;

  private activeChild: ChildProcess | undefined;
  private activeTimer: NodeJS.Timeout | undefined;

  constructor(options: ScraperServiceOptions) {
    this.jobStore = options.jobStore;
    this.scrapeTimeoutMs = options.scrapeTimeoutMs;
    this.workerPath = options.workerPath ?? defaultWorkerPath();
    this.forkFactory = options.forkFactory ?? defaultForkFactory;
    this.killProcessGroup = options.killProcessGroup ?? defaultKillProcessGroup;
    this.now = options.now ?? (() => Date.now());
  }

  isRunning(): boolean {
    return this.activeChild !== undefined || this.jobStore.getRunning() !== undefined;
  }

  getRunningJob(): ScrapeJob | undefined {
    return this.jobStore.getRunning();
  }

  getJob(jobId: string): ScrapeJob | undefined {
    return this.jobStore.get(jobId);
  }

  startScrape(request: ScrapeRequest): ScrapeAcceptedResponse {
    if (this.activeChild !== undefined) {
      const runningId = this.jobStore.getRunning()?.jobId ?? 'unknown';
      throw new ScrapeConflictError(runningId);
    }

    const running = this.jobStore.getRunning();
    if (running) {
      throw new ScrapeConflictError(running.jobId);
    }

    const adapter = getModeAdapter(request.mode);
    const searchUrl = adapter.buildSearchUrl(request);
    const querySummary = adapter.formatQuerySummary(request);
    const jobId = randomUUID();
    const startedAtMs = this.now();
    const startedAt = new Date(startedAtMs).toISOString();

    this.jobStore.setRunning({
      jobId,
      mode: request.mode,
      status: 'running',
      progress: 'Starting scrape worker...',
      startedAt,
      searchUrl,
    });

    const child = this.forkFactory(this.workerPath);
    this.activeChild = child;

    let settled = false;

    const clearTimer = (): void => {
      if (this.activeTimer) {
        clearTimeout(this.activeTimer);
        this.activeTimer = undefined;
      }
    };

    this.activeTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        this.jobStore.complete(jobId, {
          status: 'timed_out',
          finishedAt: new Date(this.now()).toISOString(),
          error: {
            code: 'scrape_timeout',
            message: `Scrape exceeded timeout of ${this.scrapeTimeoutMs} ms`,
          },
        });
      }
      if (child.pid !== undefined) {
        this.killProcessGroup(child.pid, 'SIGKILL');
      }
    }, this.scrapeTimeoutMs);

    child.on('message', (raw: unknown) => {
      const msg = raw as WorkerOutboundMessage;
      if (!msg || typeof msg !== 'object') {
        return;
      }

      if (msg.type === 'progress') {
        if (!settled) {
          this.jobStore.updateProgress(jobId, msg.message);
        }
        return;
      }

      if (msg.type === 'result') {
        if (!settled) {
          settled = true;
          clearTimer();
          const finishedAtMs = this.now();
          const items = msg.items as WillhabenHunterItem[];
          this.jobStore.complete(jobId, {
            status: 'succeeded',
            finishedAt: new Date(finishedAtMs).toISOString(),
            result: {
              querySummary,
              resultCount: items.length,
              durationMs: Math.max(0, finishedAtMs - startedAtMs),
              items,
            },
          });
        }
        return;
      }

      if (msg.type === 'error') {
        if (!settled) {
          settled = true;
          clearTimer();
          this.jobStore.complete(jobId, {
            status: 'failed',
            finishedAt: new Date(this.now()).toISOString(),
            error: {
              code: 'scrape_failed',
              message: msg.message,
            },
          });
        }
      }
    });

    child.on('error', (err: Error) => {
      if (!settled) {
        settled = true;
        clearTimer();
        this.jobStore.complete(jobId, {
          status: 'failed',
          finishedAt: new Date(this.now()).toISOString(),
          error: {
            code: 'scrape_failed',
            message: err.message,
          },
        });
      }
      if (this.activeChild === child) {
        this.activeChild = undefined;
      }
    });

    child.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimer();
      if (!settled) {
        settled = true;
        this.jobStore.complete(jobId, {
          status: 'failed',
          finishedAt: new Date(this.now()).toISOString(),
          error: {
            code: 'scrape_failed',
            message: `Scrape worker exited unexpectedly (code=${String(code)}, signal=${String(signal)})`,
          },
        });
      }
      if (this.activeChild === child) {
        this.activeChild = undefined;
      }
    });

    const startMsg: WorkerInboundMessage = { type: 'start', request };
    child.send(startMsg);

    return {
      jobId,
      status: 'running',
      searchUrl,
    };
  }

  shutdown(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = undefined;
    }
    if (this.activeChild?.pid !== undefined) {
      this.killProcessGroup(this.activeChild.pid, 'SIGKILL');
    }
  }
}
