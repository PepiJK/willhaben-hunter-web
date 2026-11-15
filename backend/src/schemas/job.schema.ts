import { z } from 'zod';
import { WillhabenItemSchema } from './scrape.schema';

export const ScrapeModeSchema = z.literal('marketplace');
export type ScrapeMode = z.infer<typeof ScrapeModeSchema>;

export const ScrapeJobStatusSchema = z.enum(['running', 'succeeded', 'failed', 'timed_out']);
export type ScrapeJobStatus = z.infer<typeof ScrapeJobStatusSchema>;

export const ScrapeResultSchema = z.object({
  querySummary: z.string(),
  resultCount: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  items: z.array(WillhabenItemSchema),
});

export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;

export const ScrapeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ScrapeError = z.infer<typeof ScrapeErrorSchema>;

export const ScrapeJobSchema = z.object({
  jobId: z.string().min(1),
  mode: ScrapeModeSchema,
  status: ScrapeJobStatusSchema,
  progress: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  searchUrl: z.string().url(),
  result: ScrapeResultSchema.optional(),
  error: ScrapeErrorSchema.optional(),
});

export type ScrapeJob = z.infer<typeof ScrapeJobSchema>;

export const ScrapeAcceptedResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.literal('running'),
  searchUrl: z.string().url(),
});

export type ScrapeAcceptedResponse = z.infer<typeof ScrapeAcceptedResponseSchema>;

export const StatusResponseSchema = z.object({
  scraping: z.boolean(),
  currentJobId: z.string().nullable(),
  currentMode: ScrapeModeSchema.nullable(),
  currentProgress: z.string().nullable(),
  startedAt: z.string().nullable(),
  anthropicConfigured: z.boolean(),
  model: z.string(),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;
