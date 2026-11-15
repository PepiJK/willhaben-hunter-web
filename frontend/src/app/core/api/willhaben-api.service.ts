import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';
import {
  AnalyzeRequest,
  AnalyzeResponse,
  MarketplaceScrapeRequest,
  MetaResponse,
  ScrapeAcceptedResponse,
  ScrapeJob,
  StatusResponse,
} from './willhaben-api.models';

@Injectable({ providedIn: 'root' })
export class WillhabenApiService {
  private readonly http = inject(HttpClient);

  getMeta(): Observable<MetaResponse> {
    return this.http.get<MetaResponse>('/api/meta');
  }

  getStatus(): Observable<StatusResponse> {
    return this.http.get<StatusResponse>('/api/status');
  }

  startScrape(request: MarketplaceScrapeRequest): Observable<ScrapeAcceptedResponse> {
    return this.http.post<ScrapeAcceptedResponse>('/api/scrape', request);
  }

  getScrapeJob(jobId: string): Observable<ScrapeJob> {
    return this.http.get<ScrapeJob>(`/api/scrape/${encodeURIComponent(jobId)}`);
  }

  pollScrapeJob(jobId: string, intervalMs = 1500): Observable<ScrapeJob> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getScrapeJob(jobId)),
      takeWhile((job) => job.status === 'running', true),
    );
  }

  analyze(request: AnalyzeRequest): Observable<AnalyzeResponse> {
    return this.http.post<AnalyzeResponse>('/api/analyze', request);
  }
}
