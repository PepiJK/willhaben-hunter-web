import type { FastifyInstance } from 'fastify';
import { AnalyzeRequestSchema } from '../schemas/analyze.schema';
import { AnalysisBudgetExceededError } from '../services/analysis-input';
import { type AnalyzerService, AnalyzerUpstreamError } from '../services/analyzer.service';

export const ANALYZE_BODY_LIMIT_BYTES = 10 * 1024 * 1024;

export async function registerAnalyzeRoutes(
  app: FastifyInstance,
  deps: { analyzerService?: AnalyzerService },
): Promise<void> {
  app.post('/api/analyze', { bodyLimit: ANALYZE_BODY_LIMIT_BYTES }, async (request, reply) => {
    if (!deps.analyzerService) {
      return reply.code(503).send({
        error: 'anthropic_not_configured',
        message: 'ANTHROPIC_API_KEY is not configured on the server',
      });
    }

    const parsed = AnalyzeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation_error',
        message: parsed.error.issues.map((i) => i.message).join('; '),
        issues: parsed.error.issues,
      });
    }

    try {
      const result = await deps.analyzerService.analyze(parsed.data);
      return reply.code(200).send(result);
    } catch (err: unknown) {
      if (err instanceof AnalysisBudgetExceededError) {
        return reply.code(413).send({
          error: 'analysis_budget_exceeded',
          message: err.message,
          maxItemsHint: err.maxItemsHint,
        });
      }

      if (err instanceof AnalyzerUpstreamError) {
        if (err.retryAfter) {
          void reply.header('Retry-After', err.retryAfter);
        }
        return reply.code(err.statusCode).send({
          error: err.statusCode === 503 ? 'upstream_rate_limited' : 'upstream_error',
          message: err.message,
        });
      }

      throw err;
    }
  });
}
