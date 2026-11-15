import { z } from 'zod';

const RawEnvSchema = z.object({
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().trim().min(1).default('claude-haiku-5-5'),
  SCRAPE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(600000),
  SCRAPE_RESULT_TTL_MS: z.coerce.number().int().min(1000).default(1800000),
  ANALYZE_MAX_INPUT_CHARS: z.coerce.number().int().min(1000).default(200000),
  STATIC_DIR: z.string().trim().optional(),
});

export interface AppConfig {
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  anthropicApiKey?: string;
  anthropicModel: string;
  scrapeTimeoutMs: number;
  scrapeResultTtlMs: number;
  analyzeMaxInputChars: number;
  staticDir?: string;
}

const PLACEHOLDER_KEYS = new Set(['', 'sk-ant-api03-your-key-here', 'your-key-here']);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = RawEnvSchema.parse(env);
  const trimmedKey = parsed.ANTHROPIC_API_KEY?.trim() ?? '';
  const anthropicApiKey = PLACEHOLDER_KEYS.has(trimmedKey) ? undefined : trimmedKey;
  const staticDir =
    parsed.STATIC_DIR && parsed.STATIC_DIR.length > 0 ? parsed.STATIC_DIR : undefined;

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    anthropicApiKey,
    anthropicModel: parsed.ANTHROPIC_MODEL,
    scrapeTimeoutMs: parsed.SCRAPE_TIMEOUT_MS,
    scrapeResultTtlMs: parsed.SCRAPE_RESULT_TTL_MS,
    analyzeMaxInputChars: parsed.ANALYZE_MAX_INPUT_CHARS,
    staticDir,
  };
}
