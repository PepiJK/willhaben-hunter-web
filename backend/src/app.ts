import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { type AppConfig, loadConfig } from './config';
import { registerAnalyzeRoutes } from './routes/analyze.routes';
import { registerHealthRoutes } from './routes/health.routes';
import { registerMetaRoutes } from './routes/meta.routes';
import { registerScrapeRoutes } from './routes/scrape.routes';
import { registerStatusRoutes } from './routes/status.routes';
import { AnalyzerService } from './services/analyzer.service';
import { InMemoryJobStore } from './services/job-store';
import { ScraperService } from './services/scraper.service';

export interface BuildAppOptions {
  config?: AppConfig;
  jobStore?: InMemoryJobStore;
  scraperService?: ScraperService;
  analyzerService?: AnalyzerService;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const jobStore = options.jobStore ?? new InMemoryJobStore({ ttlMs: config.scrapeResultTtlMs });
  const scraperService =
    options.scraperService ??
    new ScraperService({
      jobStore,
      scrapeTimeoutMs: config.scrapeTimeoutMs,
    });
  const analyzerService =
    options.analyzerService ??
    (config.anthropicApiKey
      ? new AnalyzerService({
          client: new Anthropic({ apiKey: config.anthropicApiKey }),
          model: config.anthropicModel,
          maxInputChars: config.analyzeMaxInputChars,
        })
      : undefined);

  const app = Fastify({
    logger: config.logLevel === 'silent' ? false : { level: config.logLevel },
  });

  app.addHook('onClose', async () => {
    scraperService.shutdown();
  });

  await registerHealthRoutes(app);
  await registerMetaRoutes(app);
  await registerStatusRoutes(app, { config, scraperService });
  await registerScrapeRoutes(app, { scraperService });
  await registerAnalyzeRoutes(app, { analyzerService });

  if (config.staticDir && existsSync(config.staticDir)) {
    const resolvedStaticDir = resolve(config.staticDir);
    await app.register(fastifyStatic, {
      root: resolvedStaticDir,
      prefix: '/',
      wildcard: false,
    });
  }

  app.setNotFoundHandler(async (request, reply) => {
    const urlPath = request.url.split('?')[0] ?? request.url;
    if (urlPath === '/api' || urlPath.startsWith('/api/')) {
      return reply.code(404).send({
        error: 'not_found',
        message: `API route ${request.method} ${urlPath} not found`,
      });
    }

    if (request.method === 'GET' && config.staticDir && existsSync(config.staticDir)) {
      return reply.sendFile('index.html');
    }

    return reply.code(404).send({
      error: 'not_found',
      message: `Route ${request.method} ${urlPath} not found`,
    });
  });

  return app;
}
