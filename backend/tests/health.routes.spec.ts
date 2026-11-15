import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';

describe('health and SPA fallback routes', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns 200 { status: "ok" } on GET /api/healthz', async () => {
    const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent' }) });
    const res = await app.inject({ method: 'GET', url: '/api/healthz' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('returns JSON 404 for unknown /api/* routes', async () => {
    const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent' }) });
    const res = await app.inject({ method: 'GET', url: '/api/unknown-endpoint' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: 'not_found',
      message: 'API route GET /api/unknown-endpoint not found',
    });
    await app.close();
  });

  it('serves index.html for non-/api GET routes when staticDir is configured', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'willhaben-static-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Willhaben Hunter</title>');

    const app = await buildApp({
      config: loadConfig({ LOG_LEVEL: 'silent', STATIC_DIR: dir }),
    });

    const rootRes = await app.inject({ method: 'GET', url: '/' });
    expect(rootRes.statusCode).toBe(200);
    expect(rootRes.body).toContain('Willhaben Hunter');

    const deepRouteRes = await app.inject({ method: 'GET', url: '/marketplace/results' });
    expect(deepRouteRes.statusCode).toBe(200);
    expect(deepRouteRes.body).toContain('Willhaben Hunter');

    const nonGetRes = await app.inject({ method: 'POST', url: '/unknown' });
    expect(nonGetRes.statusCode).toBe(404);

    await app.close();
  });
});
