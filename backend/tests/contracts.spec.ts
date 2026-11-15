import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnalyzeResponseSchema } from '../src/schemas/analyze.schema';
import { ScrapeJobSchema } from '../src/schemas/job.schema';
import { buildMetaResponse, MetaResponseSchema } from '../src/schemas/meta.schema';
import { WillhabenItemSchema } from '../src/schemas/scrape.schema';

function loadFixture(name: string): unknown {
  const path = resolve(__dirname, '../../contracts/fixtures', name);
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('contracts/fixtures validation', () => {
  it('matches meta.json exactly to buildMetaResponse()', () => {
    const fixture = MetaResponseSchema.parse(loadFixture('meta.json'));
    expect(fixture).toEqual(buildMetaResponse());
  });

  it('validates scrape-job-running.json and scrape-job-succeeded.marketplace.json', () => {
    const running = ScrapeJobSchema.parse(loadFixture('scrape-job-running.json'));
    expect(running.status).toBe('running');

    const succeeded = ScrapeJobSchema.parse(loadFixture('scrape-job-succeeded.marketplace.json'));
    expect(succeeded.status).toBe('succeeded');
    expect(succeeded.result?.items.length).toBe(3);
  });

  it('validates cli-export.marketplace.json as WillhabenItem[]', () => {
    const items = WillhabenItemSchema.array().parse(loadFixture('cli-export.marketplace.json'));
    expect(items.length).toBe(3);
  });

  it('validates analyze-response.json against AnalyzeResponseSchema', () => {
    const analysis = AnalyzeResponseSchema.parse(loadFixture('analyze-response.json'));
    expect(analysis.recommendations).toHaveLength(2);
    expect(analysis.recommendations[0]?.rank).toBe(1);
  });
});
