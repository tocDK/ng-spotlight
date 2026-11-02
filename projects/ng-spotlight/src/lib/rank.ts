import type { SpotlightItem } from './types';

const WORD_BOUNDARY = /[\s\-_/.:,()[\]]/;

/** Score bonus for items that are in Recent. Smaller than the gap between match tiers. */
export const RECENT_BOOST = 50;

/**
 * 1000 exact, 800 start of text, 600 start of a word, 200–300 subsequence (tighter is higher),
 * -1 no match, 0 for the empty query.
 */
export function scoreText(text: string, query: string): number {
  if (query === '') return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800;
  for (let i = t.indexOf(q, 1); i > 0; i = t.indexOf(q, i + 1)) {
    if (WORD_BOUNDARY.test(t[i - 1])) return 600;
  }
  let pos = -1;
  let first = -1;
  for (const ch of q) {
    pos = t.indexOf(ch, pos + 1);
    if (pos === -1) return -1;
    if (first === -1) first = pos;
  }
  const gaps = pos - first + 1 - q.length;
  return 200 + Math.max(0, 100 - gaps);
}

/** Title score, or half the best keyword score, plus the Recent boost. null = no match. */
export function scoreItem(item: SpotlightItem, query: string, recentIds: ReadonlySet<string>): number | null {
  let best = scoreText(item.title, query);
  for (const keyword of item.keywords ?? []) {
    const score = scoreText(keyword, query);
    if (score >= 0) best = Math.max(best, score / 2);
  }
  if (best < 0) return null;
  return best + (recentIds.has(item.id) ? RECENT_BOOST : 0);
}

/** Filters and sorts local results. Stable: equal scores keep the source's order. */
export function rankItems(
  items: readonly SpotlightItem[],
  query: string,
  recentIds: ReadonlySet<string> = new Set(),
): SpotlightItem[] {
  if (query === '') return [...items];
  return items
    .map((item, index) => ({ item, index, score: scoreItem(item, query, recentIds) }))
    .filter((entry): entry is { item: SpotlightItem; index: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
