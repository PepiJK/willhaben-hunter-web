import type { FastifyInstance } from 'fastify';
import { buildMetaResponse } from '../schemas/meta.schema';

export async function registerMetaRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/meta', async () => {
    return buildMetaResponse();
  });
}
