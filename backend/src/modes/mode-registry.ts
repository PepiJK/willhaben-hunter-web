import { marketplaceModeAdapter, type ScrapeModeAdapter } from './marketplace.mode';

const MODE_REGISTRY: Record<'marketplace', ScrapeModeAdapter<'marketplace'>> = {
  marketplace: marketplaceModeAdapter,
};

export type SupportedMode = keyof typeof MODE_REGISTRY;

export function getModeAdapter(mode: SupportedMode): ScrapeModeAdapter<'marketplace'> {
  const adapter = MODE_REGISTRY[mode];
  if (!adapter) {
    throw new Error(`Unsupported scrape mode: ${String(mode)}`);
  }
  return adapter;
}
