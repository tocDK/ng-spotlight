import type { SpotlightRecentEntry, SpotlightRecentStorage } from './types';

/** In-memory Recent storage that records every save. */
export function memoryRecent(initial: SpotlightRecentEntry[] = []): SpotlightRecentStorage & { saved: SpotlightRecentEntry[][] } {
  let current = [...initial];
  const saved: SpotlightRecentEntry[][] = [];
  return {
    saved,
    load: () => Promise.resolve([...current]),
    save: (items) => {
      current = [...items];
      saved.push([...items]);
      return Promise.resolve();
    },
  };
}

/** Lets pending promises and zero-delay timers run. */
export const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
