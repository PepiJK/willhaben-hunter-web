import { WillhabenHunterArea, WillhabenHunterSortOrder } from 'willhaben-hunter';
import { z } from 'zod';

export const WILLHABEN_ORIGIN = 'https://www.willhaben.at/';

export const MARKETPLACE_LIMITS = {
  defaultLimit: 25,
  maxWithDetails: 100,
  maxSkipDetails: 250,
} as const;

export const WillhabenItemSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  price: z.string().optional(),
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith(WILLHABEN_ORIGIN), {
      message: `url must start with ${WILLHABEN_ORIGIN}`,
    }),
  description: z.string().optional(),
  attributes: z.string().optional(),
});

export type WillhabenItem = z.infer<typeof WillhabenItemSchema>;

export const MarketplaceScrapeRequestSchema = z
  .object({
    mode: z.literal('marketplace'),
    query: z.string().trim().min(1, 'query is required').max(200, 'query max length is 200'),
    priceMin: z.number().finite().nonnegative().optional(),
    priceMax: z.number().finite().nonnegative().optional(),
    area: z.array(z.nativeEnum(WillhabenHunterArea)).min(1).optional(),
    wienDistricts: z.array(z.number().int().min(1).max(23)).min(1).optional(),
    sort: z.nativeEnum(WillhabenHunterSortOrder).optional(),
    limit: z.number().int().min(1).default(MARKETPLACE_LIMITS.defaultLimit),
    skipDetails: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.priceMin !== undefined && val.priceMax !== undefined && val.priceMin > val.priceMax) {
      ctx.addIssue({
        code: 'custom',
        path: ['priceMin'],
        message: 'priceMin must be less than or equal to priceMax',
      });
    }

    if (
      val.wienDistricts &&
      val.wienDistricts.length > 0 &&
      !val.area?.includes(WillhabenHunterArea.WIEN)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['wienDistricts'],
        message: 'wienDistricts requires "wien" to be included in area',
      });
    }

    const maxLimit = val.skipDetails
      ? MARKETPLACE_LIMITS.maxSkipDetails
      : MARKETPLACE_LIMITS.maxWithDetails;
    if (val.limit > maxLimit) {
      ctx.addIssue({
        code: 'custom',
        path: ['limit'],
        message: `limit must be <= ${maxLimit} when skipDetails is ${val.skipDetails}`,
      });
    }
  });

export type MarketplaceScrapeRequest = z.infer<typeof MarketplaceScrapeRequestSchema>;

export const ScrapeRequestSchema = z.discriminatedUnion('mode', [MarketplaceScrapeRequestSchema]);

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;
