export type ScrapeMode = 'marketplace';

export type ScrapeJobStatus = 'running' | 'succeeded' | 'failed' | 'timed_out';

export type AnalyzeVerdict = 'top-pick' | 'good-alternative' | 'caution';

export interface WillhabenItem {
  id: string;
  title: string;
  price?: string;
  url: string;
  description?: string;
  attributes?: string;
}

export interface MarketplaceScrapeRequest {
  mode: 'marketplace';
  query: string;
  priceMin?: number;
  priceMax?: number;
  area?: string[];
  wienDistricts?: number[];
  sort?: string;
  limit: number;
  skipDetails: boolean;
}

export interface ScrapeAcceptedResponse {
  jobId: string;
  status: 'running';
  searchUrl: string;
}

export interface ScrapeConflictResponse {
  error: 'scrape_in_progress';
  message: string;
  jobId: string;
}

export interface ScrapeResult {
  querySummary: string;
  resultCount: number;
  durationMs: number;
  items: WillhabenItem[];
}

export interface ScrapeError {
  code: string;
  message: string;
}

export interface ScrapeJob {
  jobId: string;
  mode: ScrapeMode;
  status: ScrapeJobStatus;
  progress: string | null;
  startedAt: string;
  finishedAt?: string;
  searchUrl: string;
  result?: ScrapeResult;
  error?: ScrapeError;
}

export interface StatusResponse {
  scraping: boolean;
  currentJobId: string | null;
  currentMode: ScrapeMode | null;
  currentProgress: string | null;
  startedAt: string | null;
  anthropicConfigured: boolean;
  model: string;
}

export interface MetaStringOption {
  value: string;
  label: string;
}

export interface MetaNumberOption {
  value: number;
  label: string;
}

export interface MetaResponse {
  modes: ScrapeMode[];
  marketplace: {
    areas: MetaStringOption[];
    wienDistricts: MetaNumberOption[];
    sortOrders: MetaStringOption[];
    limits: {
      defaultLimit: number;
      maxWithDetails: number;
      maxSkipDetails: number;
    };
  };
}

export interface AnalyzeRequest {
  mode: 'marketplace';
  prompt: string;
  items: WillhabenItem[];
}

export interface AnalyzeRecommendation {
  rank: number;
  id: string;
  title: string;
  price?: string;
  url: string;
  fitScore: number;
  verdict: AnalyzeVerdict;
  justification: string;
  pros: string[];
  cons: string[];
}

export interface AnalyzeResponse {
  model: string;
  summary: string;
  totalEvaluated: number;
  truncatedFields: number;
  droppedRecommendations: number;
  recommendations: AnalyzeRecommendation[];
}

export interface ApiErrorPayload {
  error: string;
  message: string;
  jobId?: string;
  maxItemsHint?: number;
}
