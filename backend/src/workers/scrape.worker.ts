import type { WillhabenHunterItem } from 'willhaben-hunter';
import type { ScraperLike } from '../modes/marketplace.mode';
import { getModeAdapter } from '../modes/mode-registry';
import type { ScrapeRequest } from '../schemas/scrape.schema';

export interface WorkerInboundMessage {
  type: 'start';
  request: ScrapeRequest;
}

export type WorkerOutboundMessage =
  | { type: 'progress'; message: string }
  | { type: 'result'; items: WillhabenHunterItem[] }
  | { type: 'error'; message: string };

export async function executeWorkerMessage(
  msg: WorkerInboundMessage,
  send: (outbound: WorkerOutboundMessage) => void,
  createScraper?: () => ScraperLike<Record<string, unknown>>,
): Promise<void> {
  try {
    const adapter = getModeAdapter(msg.request.mode);
    const scraper = createScraper
      ? createScraper()
      : (adapter.createScraper() as unknown as ScraperLike<Record<string, unknown>>);
    const libraryOptions = adapter.toLibraryOptions(msg.request) as unknown as Record<
      string,
      unknown
    >;

    const items = await scraper.scrape({
      ...libraryOptions,
      onProgress: (message: string) => {
        send({ type: 'progress', message });
      },
    });

    send({ type: 'result', items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    send({ type: 'error', message });
  }
}

/* c8 ignore start */
if (require.main === module) {
  const sendIpc = (outbound: WorkerOutboundMessage): void => {
    if (typeof process.send === 'function') {
      process.send(outbound);
    }
  };

  process.on('message', (raw: unknown) => {
    const msg = raw as WorkerInboundMessage;
    if (!msg || msg.type !== 'start') {
      sendIpc({ type: 'error', message: 'Invalid worker message' });
      process.exit(1);
    }

    void executeWorkerMessage(msg, sendIpc).then(
      () => process.exit(0),
      (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendIpc({ type: 'error', message });
        process.exit(1);
      },
    );
  });
}
/* c8 ignore stop */
