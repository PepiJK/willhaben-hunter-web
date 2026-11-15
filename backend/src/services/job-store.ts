import type { ScrapeError, ScrapeJob, ScrapeJobStatus, ScrapeResult } from '../schemas/job.schema';

export interface InMemoryJobStoreOptions {
  ttlMs: number;
  now?: () => number;
}

export interface JobCompletion {
  status: Exclude<ScrapeJobStatus, 'running'>;
  finishedAt: string;
  result?: ScrapeResult;
  error?: ScrapeError;
}

interface FinishedJobEntry {
  job: ScrapeJob;
  finishedAtMs: number;
}

export class InMemoryJobStore {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private runningJob: ScrapeJob | undefined;
  private lastFinished: FinishedJobEntry | undefined;

  constructor(options: InMemoryJobStoreOptions) {
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? (() => Date.now());
  }

  setRunning(job: ScrapeJob): void {
    this.runningJob = { ...job };
  }

  getRunning(): ScrapeJob | undefined {
    return this.runningJob;
  }

  updateProgress(jobId: string, progress: string): void {
    if (this.runningJob?.jobId === jobId) {
      this.runningJob = {
        ...this.runningJob,
        progress,
      };
    }
  }

  complete(jobId: string, completion: JobCompletion): ScrapeJob | undefined {
    if (this.runningJob?.jobId !== jobId) {
      return undefined;
    }

    const completed: ScrapeJob = {
      ...this.runningJob,
      status: completion.status,
      finishedAt: completion.finishedAt,
      ...(completion.result !== undefined ? { result: completion.result } : {}),
      ...(completion.error !== undefined ? { error: completion.error } : {}),
    };

    this.runningJob = undefined;
    this.lastFinished = {
      job: completed,
      finishedAtMs: this.now(),
    };

    return completed;
  }

  get(jobId: string): ScrapeJob | undefined {
    if (this.runningJob?.jobId === jobId) {
      return this.runningJob;
    }

    if (this.lastFinished) {
      if (this.now() - this.lastFinished.finishedAtMs > this.ttlMs) {
        this.lastFinished = undefined;
        return undefined;
      }

      if (this.lastFinished.job.jobId === jobId) {
        return this.lastFinished.job;
      }
    }

    return undefined;
  }
}
