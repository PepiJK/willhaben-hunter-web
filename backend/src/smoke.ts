import { WillhabenHunterArea, WillhabenHunterMarketplaceScraper } from 'willhaben-hunter';

interface SmokeCliOptions {
  query: string;
  limit: number;
  skipDetails: boolean;
}

function parseSmokeArgs(argv: string[]): SmokeCliOptions {
  let query = 'fahrrad';
  let limit = 3;
  let skipDetails = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--query' && argv[i + 1]) {
      query = argv[++i];
    } else if (arg === '--limit' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[++i], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
      }
    } else if (arg === '--with-details') {
      skipDetails = false;
    } else if (arg === '--skip-details') {
      skipDetails = true;
    }
  }

  return { query, limit, skipDetails };
}

async function runSmoke(): Promise<void> {
  const opts = parseSmokeArgs(process.argv.slice(2));
  const startedAt = Date.now();
  const scraper = new WillhabenHunterMarketplaceScraper();

  console.log(
    `[smoke] Starting Marktplatz scrape (query="${opts.query}", area=wien, limit=${opts.limit}, skipDetails=${opts.skipDetails})...`,
  );

  const items = await scraper.scrape({
    query: opts.query,
    area: [WillhabenHunterArea.WIEN],
    limit: opts.limit,
    skipDetails: opts.skipDetails,
    onProgress: (msg) => console.log(`[smoke] ${msg}`),
  });

  const durationMs = Date.now() - startedAt;
  const validItems = items.filter(
    (item) =>
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.url === 'string' &&
      item.url.startsWith('https://www.willhaben.at/'),
  );

  if (validItems.length < 1) {
    console.error(
      `[smoke] FAILED: Expected >= 1 valid Willhaben item, received ${validItems.length} (total=${items.length}) after ${durationMs}ms.`,
    );
    process.exit(1);
  }

  console.log(
    `[smoke] OK: Scraped ${validItems.length} valid item(s) in ${durationMs}ms. Sample: [${validItems[0].id}] ${validItems[0].title} (${validItems[0].price ?? 'n/a'})`,
  );
}

void runSmoke().catch((err: unknown) => {
  console.error('[smoke] FAILED with error:', err);
  process.exit(1);
});
