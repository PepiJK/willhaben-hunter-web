import type { FastifyInstance } from 'fastify';
import { ScrapeRequestSchema } from '../schemas/scrape.schema';
import { ScrapeConflictError, type ScraperService } from '../services/scraper.service';

export async function registerScrapeRoutes(
  app: FastifyInstance,
  deps: { scraperService: ScraperService },
): Promise<void> {
  app.post('/api/scrape', async (request, reply) => {
    const parsed = ScrapeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation_error',
        message: parsed.error.issues.map((i) => i.message).join('; '),
        issues: parsed.error.issues,
      });
    }

    try {
      const accepted = deps.scraperService.startScrape(parsed.data);
      return reply.code(202).send(accepted);
    } catch (err: unknown) {
      if (err instanceof ScrapeConflictError) {
        return reply.code(409).send({
          error: 'scrape_in_progress',
          message: err.message,
          jobId: err.activeJobId,
        });
      }
      throw err;
    }
  });

  app.get<{ Params: { jobId: string } }>('/api/scrape/:jobId', async (request, reply) => {
    const job = deps.scraperService.getJob(request.params.jobId);
    if (!job) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Scrape job ${request.params.jobId} not found or expired`,
      });
    }
    return reply.code(200).send(job);
  });
}
