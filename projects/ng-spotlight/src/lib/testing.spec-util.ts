import axe from 'axe-core';
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

/** Runs axe (WCAG 2.0/2.1/2.2 A and AA) over the document and fails on any violation. Reusable by adapter specs. */
export async function expectNoAxeViolations(): Promise<void> {
  // The jsdom test document has no title or language; give it both so axe judges the overlay only.
  document.title ||= 'ng-spotlight test';
  document.documentElement.lang ||= 'en';
  // The CDK focus-trap anchors are aria-hidden tab stops by design; they are tested upstream.
  const results = await axe.run(
    { exclude: ['.cdk-focus-trap-anchor'] },
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } },
  );
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
