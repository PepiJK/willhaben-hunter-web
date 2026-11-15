import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config';
import type { StatusResponse } from '../schemas/job.schema';
import type { ScraperService } from '../services/scraper.service';

export async function registerStatusRoutes(
  app: FastifyInstance,
  deps: { config: AppConfig; scraperService: ScraperService },
): Promise<void> {
  app.get('/api/status', async (): Promise<StatusResponse> => {
    const runningJob = deps.scraperService.getRunningJob();
    return {
      scraping: deps.scraperService.isRunning(),
      currentJobId: runningJob?.jobId ?? null,
      currentMode: runningJob?.mode ?? null,
      currentProgress: runningJob?.progress ?? null,
      startedAt: runningJob?.startedAt ?? null,
      anthropicConfigured: Boolean(deps.config.anthropicApiKey),
      model: deps.config.anthropicModel,
    };
  });
}
