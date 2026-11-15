import { z } from 'zod';
import { WILLHABEN_ORIGIN, WillhabenItemSchema } from './scrape.schema';

export const AnalyzeVerdictSchema = z.enum(['top-pick', 'good-alternative', 'caution']);
export type AnalyzeVerdict = z.infer<typeof AnalyzeVerdictSchema>;

export const AnalyzeRequestSchema = z.object({
  mode: z.literal('marketplace'),
  prompt: z.string().trim().min(1, 'prompt is required').max(4000, 'prompt max length is 4000'),
  items: z.array(WillhabenItemSchema).min(1).max(250),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ToolRecommendationSchema = z.object({
  id: z.string().trim().min(1),
  fitScore: z.number().finite(),
  verdict: AnalyzeVerdictSchema,
  justification: z.string().trim().min(1),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
});

export const ToolAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(1),
  recommendations: z.array(ToolRecommendationSchema),
});

export const AnalyzeRecommendationSchema = z.object({
  rank: z.number().int().min(1).max(10),
  id: z.string().min(1),
  title: z.string().min(1),
  price: z.string().optional(),
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith(WILLHABEN_ORIGIN), {
      message: `url must start with ${WILLHABEN_ORIGIN}`,
    }),
  fitScore: z.number().min(0).max(100),
  verdict: AnalyzeVerdictSchema,
  justification: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

export type AnalyzeRecommendation = z.infer<typeof AnalyzeRecommendationSchema>;

export const AnalyzeResponseSchema = z.object({
  model: z.string().min(1),
  summary: z.string(),
  totalEvaluated: z.number().int().nonnegative(),
  truncatedFields: z.number().int().nonnegative(),
  droppedRecommendations: z.number().int().nonnegative(),
  recommendations: z.array(AnalyzeRecommendationSchema).max(10),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
