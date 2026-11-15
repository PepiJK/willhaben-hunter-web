import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { AnalyzerService, type AnthropicClientLike } from '../src/services/analyzer.service';

const VALID_ITEM = {
  id: '911861422',
  title: 'Männershirt',
  price: '€ 8',
  url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/maennershirt-911861422/',
  description: 'Fahrradshirt in Größe Large',
  attributes: 'Zustand: Gebraucht',
};

describe('POST /api/analyze', () => {
  it('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent' }) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: {
        mode: 'marketplace',
        prompt: 'Best deal?',
        items: [VALID_ITEM],
      },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('anthropic_not_configured');
    await app.close();
  });

  it('returns 400 on invalid payload (empty items or empty prompt)', async () => {
    const app = await buildApp({
      config: loadConfig({ LOG_LEVEL: 'silent', ANTHROPIC_API_KEY: 'sk-ant-test' }),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: {
        mode: 'marketplace',
        prompt: '   ',
        items: [],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation_error');
    await app.close();
  });

  it('accepts payloads larger than 1 MiB (up to 10 MiB) and returns 413 when budget is exceeded', async () => {
    const bigItems = Array.from({ length: 180 }, (_, idx) => ({
      id: String(idx + 1),
      title: `Large Item ${idx + 1}`,
      price: '€ 50',
      url: `https://www.willhaben.at/iad/kaufen-und-verkaufen/d/item-${idx + 1}/`,
      description: 'z'.repeat(8000),
    }));
    const bodyString = JSON.stringify({
      mode: 'marketplace',
      prompt: 'Find best',
      items: bigItems,
    });
    expect(Buffer.byteLength(bodyString, 'utf8')).toBeGreaterThan(1_048_576);

    const app = await buildApp({
      config: loadConfig({
        LOG_LEVEL: 'silent',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        ANALYZE_MAX_INPUT_CHARS: '50000',
      }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: bodyString,
      headers: { 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({
      error: 'analysis_budget_exceeded',
      maxItemsHint: expect.any(Number),
    });
    await app.close();
  });

  it('maps upstream 429 rate-limit to 503 and other upstream errors to 502', async () => {
    const rateLimitClient: AnthropicClientLike = {
      messages: {
        create: vi.fn(async () => {
          const err = Object.assign(new Error('Rate limited'), {
            status: 429,
            headers: { 'retry-after': '12' },
          });
          throw err;
        }),
      },
    };

    const config = loadConfig({ LOG_LEVEL: 'silent', ANTHROPIC_API_KEY: 'sk-ant-test' });
    const app429 = await buildApp({
      config,
      analyzerService: new AnalyzerService({
        client: rateLimitClient,
        model: config.anthropicModel,
        maxInputChars: config.analyzeMaxInputChars,
      }),
    });

    const res429 = await app429.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: { mode: 'marketplace', prompt: 'Rank', items: [VALID_ITEM] },
    });
    expect(res429.statusCode).toBe(503);
    expect(res429.headers['retry-after']).toBe('12');
    await app429.close();

    const failClient: AnthropicClientLike = {
      messages: {
        create: vi.fn(async () => {
          throw Object.assign(new Error('Internal error'), { status: 500 });
        }),
      },
    };
    const app502 = await buildApp({
      config,
      analyzerService: new AnalyzerService({
        client: failClient,
        model: config.anthropicModel,
        maxInputChars: config.analyzeMaxInputChars,
      }),
    });

    const res502 = await app502.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: { mode: 'marketplace', prompt: 'Rank', items: [VALID_ITEM] },
    });
    expect(res502.statusCode).toBe(502);
    expect(res502.json().error).toBe('upstream_error');
    await app502.close();
  });

  it('returns 200 with server-joined recommendations on success', async () => {
    const okClient: AnthropicClientLike = {
      messages: {
        create: vi.fn(async () => ({
          content: [
            {
              type: 'tool_use',
              name: 'record_willhaben_analysis',
              input: {
                summary: 'Solid bike shirt.',
                recommendations: [
                  {
                    id: '911861422',
                    fitScore: 88,
                    verdict: 'top-pick',
                    justification: 'Fair price.',
                    pros: ['€ 8'],
                    cons: [],
                  },
                ],
              },
            },
          ],
        })),
      },
    };

    const config = loadConfig({ LOG_LEVEL: 'silent', ANTHROPIC_API_KEY: 'sk-ant-test' });
    const app = await buildApp({
      config,
      analyzerService: new AnalyzerService({
        client: okClient,
        model: config.anthropicModel,
        maxInputChars: config.analyzeMaxInputChars,
      }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: { mode: 'marketplace', prompt: 'Top pick', items: [VALID_ITEM] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      model: 'claude-haiku-5-5',
      totalEvaluated: 1,
      recommendations: [
        {
          rank: 1,
          id: '911861422',
          title: 'Männershirt',
          price: '€ 8',
          url: 'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/maennershirt-911861422/',
          fitScore: 88,
          verdict: 'top-pick',
        },
      ],
    });
    await app.close();
  });
});
