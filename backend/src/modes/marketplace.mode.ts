import {
  WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP,
  WillhabenHunterMarketplaceScraper,
  type WillhabenHunterItem,
  type WillhabenHunterMarketplaceScrapeOptions,
  type WillhabenHunterProgressCallback,
  type WillhabenHunterViennaDistrict,
} from 'willhaben-hunter';
import {
  type MarketplaceScrapeRequest,
  MarketplaceScrapeRequestSchema,
} from '../schemas/scrape.schema';

export interface ScraperLike<TOptions> {
  scrape(
    options: TOptions & { onProgress?: WillhabenHunterProgressCallback },
  ): Promise<WillhabenHunterItem[]>;
}

export interface ScrapeModeAdapter<
  TMode extends 'marketplace' = 'marketplace',
  TRequest extends MarketplaceScrapeRequest = MarketplaceScrapeRequest,
  TLibOptions = WillhabenHunterMarketplaceScrapeOptions,
> {
  readonly mode: TMode;
  readonly schema: typeof MarketplaceScrapeRequestSchema;
  toLibraryOptions(request: TRequest): TLibOptions;
  buildSearchUrl(request: TRequest): string;
  formatQuerySummary(request: TRequest): string;
  createScraper(): ScraperLike<TLibOptions>;
}

function mapViennaDistricts(districts?: number[]): WillhabenHunterViennaDistrict[] | undefined {
  if (!districts || districts.length === 0) {
    return undefined;
  }

  return districts.map((num) => {
    const mapped = WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP[num];
    if (!mapped) {
      throw new Error(`Invalid Vienna district number: ${num}`);
    }
    return mapped;
  });
}

export const marketplaceModeAdapter: ScrapeModeAdapter<'marketplace'> = {
  mode: 'marketplace',
  schema: MarketplaceScrapeRequestSchema,

  toLibraryOptions(request: MarketplaceScrapeRequest): WillhabenHunterMarketplaceScrapeOptions {
    const options: WillhabenHunterMarketplaceScrapeOptions = {
      query: request.query,
      limit: request.limit,
      skipDetails: request.skipDetails,
    };

    if (request.priceMin !== undefined) {
      options.priceMin = request.priceMin;
    }
    if (request.priceMax !== undefined) {
      options.priceMax = request.priceMax;
    }
    if (request.area && request.area.length > 0) {
      options.area = request.area;
    }
    const mappedDistricts = mapViennaDistricts(request.wienDistricts);
    if (mappedDistricts && mappedDistricts.length > 0) {
      options.wienDistricts = mappedDistricts;
    }
    if (request.sort !== undefined) {
      options.sort = request.sort;
    }

    return options;
  },

  buildSearchUrl(request: MarketplaceScrapeRequest): string {
    const scraper = new WillhabenHunterMarketplaceScraper();
    return scraper.buildUrl(this.toLibraryOptions(request));
  },

  formatQuerySummary(request: MarketplaceScrapeRequest): string {
    const parts: string[] = [];
    if (request.area && request.area.length > 0) {
      parts.push(request.area.join(', '));
    }
    parts.push(`limit ${request.limit}`);
    return `${request.query} (${parts.join(', ')})`;
  },

  createScraper(): ScraperLike<WillhabenHunterMarketplaceScrapeOptions> {
    return new WillhabenHunterMarketplaceScraper();
  },
};
