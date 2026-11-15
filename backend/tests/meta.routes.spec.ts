import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { MetaResponseSchema } from '../src/schemas/meta.schema';

describe('GET /api/meta', () => {
  it('returns valid Marktplatz option metadata derived from willhaben-hunter enums', async () => {
    const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent' }) });
    const res = await app.inject({ method: 'GET', url: '/api/meta' });

    expect(res.statusCode).toBe(200);
    const body = MetaResponseSchema.parse(res.json());
    expect(body.modes).toEqual(['marketplace']);
    expect(body.marketplace.areas).toHaveLength(9);
    expect(body.marketplace.wienDistricts).toHaveLength(23);
    expect(body.marketplace.sortOrders).toHaveLength(4);
    expect(body.marketplace.limits).toEqual({
      defaultLimit: 25,
      maxWithDetails: 100,
      maxSkipDetails: 250,
    });

    await app.close();
  });
});
