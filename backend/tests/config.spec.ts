import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('applies default configuration values including SCRAPE_TIMEOUT_MS=600000', () => {
    const config = loadConfig({});

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(8000);
    expect(config.logLevel).toBe('info');
    expect(config.anthropicApiKey).toBeUndefined();
    expect(config.anthropicModel).toBe('claude-haiku-5-5');
    expect(config.scrapeTimeoutMs).toBe(600000);
    expect(config.scrapeResultTtlMs).toBe(1800000);
    expect(config.analyzeMaxInputChars).toBe(200000);
    expect(config.staticDir).toBeUndefined();
  });

  it('parses custom environment variables and trims API keys', () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      PORT: '9090',
      LOG_LEVEL: 'debug',
      ANTHROPIC_API_KEY: '  sk-ant-test-key  ',
      ANTHROPIC_MODEL: 'claude-haiku-5-5-20260101',
      SCRAPE_TIMEOUT_MS: '120000',
      SCRAPE_RESULT_TTL_MS: '60000',
      ANALYZE_MAX_INPUT_CHARS: '150000',
      STATIC_DIR: '/app/static',
    });

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(9090);
    expect(config.logLevel).toBe('debug');
    expect(config.anthropicApiKey).toBe('sk-ant-test-key');
    expect(config.anthropicModel).toBe('claude-haiku-5-5-20260101');
    expect(config.scrapeTimeoutMs).toBe(120000);
    expect(config.scrapeResultTtlMs).toBe(60000);
    expect(config.analyzeMaxInputChars).toBe(150000);
    expect(config.staticDir).toBe('/app/static');
  });

  it('treats empty or placeholder ANTHROPIC_API_KEY as unconfigured', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: '   ' }).anthropicApiKey).toBeUndefined();
    expect(
      loadConfig({ ANTHROPIC_API_KEY: 'sk-ant-api03-your-key-here' }).anthropicApiKey,
    ).toBeUndefined();
  });

  it('throws on invalid numeric or enum configuration values', () => {
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow();
    expect(() => loadConfig({ PORT: '70000' })).toThrow();
    expect(() => loadConfig({ SCRAPE_TIMEOUT_MS: '0' })).toThrow();
    expect(() => loadConfig({ SCRAPE_RESULT_TTL_MS: '-5' })).toThrow();
    expect(() => loadConfig({ ANALYZE_MAX_INPUT_CHARS: '100' })).toThrow();
    expect(() => loadConfig({ LOG_LEVEL: 'invalid' })).toThrow();
  });
});
