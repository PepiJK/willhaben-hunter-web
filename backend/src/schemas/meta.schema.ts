import {
  WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP,
  WillhabenHunterArea,
  WillhabenHunterSortOrder,
} from 'willhaben-hunter';
import { z } from 'zod';
import { MARKETPLACE_LIMITS } from './scrape.schema';

export const StringOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const NumberOptionSchema = z.object({
  value: z.number().int(),
  label: z.string(),
});

export const MetaResponseSchema = z.object({
  modes: z.array(z.literal('marketplace')),
  marketplace: z.object({
    areas: z.array(StringOptionSchema),
    wienDistricts: z.array(NumberOptionSchema),
    sortOrders: z.array(StringOptionSchema),
    limits: z.object({
      defaultLimit: z.number().int(),
      maxWithDetails: z.number().int(),
      maxSkipDetails: z.number().int(),
    }),
  }),
});

export type MetaResponse = z.infer<typeof MetaResponseSchema>;

const AREA_LABELS: Record<WillhabenHunterArea, string> = {
  [WillhabenHunterArea.WIEN]: 'Wien',
  [WillhabenHunterArea.NIEDEROESTERREICH]: 'Niederösterreich',
  [WillhabenHunterArea.OBEROESTERREICH]: 'Oberösterreich',
  [WillhabenHunterArea.SALZBURG]: 'Salzburg',
  [WillhabenHunterArea.TIROL]: 'Tirol',
  [WillhabenHunterArea.VORARLBERG]: 'Vorarlberg',
  [WillhabenHunterArea.KAERNTEN]: 'Kärnten',
  [WillhabenHunterArea.STEIERMARK]: 'Steiermark',
  [WillhabenHunterArea.BURGENLAND]: 'Burgenland',
};

const SORT_LABELS: Record<WillhabenHunterSortOrder, string> = {
  [WillhabenHunterSortOrder.RELEVANZ]: 'Relevanz',
  [WillhabenHunterSortOrder.NEUESTE]: 'Neueste zuerst',
  [WillhabenHunterSortOrder.PREIS_AUFSTEIGEND]: 'Preis aufsteigend',
  [WillhabenHunterSortOrder.PREIS_ABSTEIGEND]: 'Preis absteigend',
};

export function buildMetaResponse(): MetaResponse {
  const areas = Object.values(WillhabenHunterArea).map((value) => ({
    value,
    label: AREA_LABELS[value],
  }));

  const wienDistricts = Object.entries(WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP)
    .map(([num, label]) => ({
      value: Number(num),
      label,
    }))
    .sort((a, b) => a.value - b.value);

  const sortOrders = Object.values(WillhabenHunterSortOrder).map((value) => ({
    value,
    label: SORT_LABELS[value],
  }));

  return {
    modes: ['marketplace'],
    marketplace: {
      areas,
      wienDistricts,
      sortOrders,
      limits: {
        defaultLimit: MARKETPLACE_LIMITS.defaultLimit,
        maxWithDetails: MARKETPLACE_LIMITS.maxWithDetails,
        maxSkipDetails: MARKETPLACE_LIMITS.maxSkipDetails,
      },
    },
  };
}
