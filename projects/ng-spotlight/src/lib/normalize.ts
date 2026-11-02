import type { SpotlightItem, SpotlightResponse } from './types';

/** A group after validation. Every item's `group` equals the group id. */
export interface NormalizedGroup {
  id: string;
  label: string;
  total?: number;
  items: SpotlightItem[];
}

export class SpotlightResultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpotlightResultError';
  }
}

export function isSpotlightResponse(value: unknown): value is SpotlightResponse {
  return typeof value === 'object' && value !== null && Array.isArray((value as { groups?: unknown }).groups);
}

function isValidAction(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const action = value as Record<string, unknown>;
  return (
    typeof action['route'] === 'string' ||
    Array.isArray(action['route']) ||
    typeof action['url'] === 'string' ||
    typeof action['run'] === 'function'
  );
}

/** id and title are non-empty strings, the action is usable and `children` (reserved) is absent. */
export function isValidItem(value: unknown): value is SpotlightItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === 'string' &&
    item['id'] !== '' &&
    typeof item['title'] === 'string' &&
    isValidAction(item['action']) &&
    item['children'] === undefined
  );
}

/**
 * Turns whatever a source returned into validated groups. Invalid items and groups are
 * dropped; a value that is not a result at all throws SpotlightResultError, which the
 * engine turns into an error row for that source only.
 */
export function normalizeResult(result: unknown, fallbackGroup: string): NormalizedGroup[] {
  if (Array.isArray(result)) {
    const byGroup = new Map<string, SpotlightItem[]>();
    for (const raw of result as unknown[]) {
      if (!isValidItem(raw)) continue;
      const group = typeof raw.group === 'string' && raw.group !== '' ? raw.group : fallbackGroup;
      const list = byGroup.get(group) ?? [];
      list.push({ ...raw, group });
      byGroup.set(group, list);
    }
    return [...byGroup].map(([id, items]) => ({ id, label: id, items }));
  }
  if (isSpotlightResponse(result)) {
    const groups: NormalizedGroup[] = [];
    for (const rawGroup of result.groups as unknown[]) {
      if (typeof rawGroup !== 'object' || rawGroup === null) continue;
      const g = rawGroup as Record<string, unknown>;
      const id = g['id'];
      if (typeof id !== 'string' || id === '') continue;
      const rawItems: unknown[] = Array.isArray(g['items']) ? (g['items'] as unknown[]) : [];
      const group: NormalizedGroup = {
        id,
        label: typeof g['label'] === 'string' ? g['label'] : id,
        items: rawItems.filter(isValidItem).map((item) => ({ ...item, group: id })),
      };
      const total = g['total'];
      if (typeof total === 'number') group.total = total;
      groups.push(group);
    }
    return groups;
  }
  throw new SpotlightResultError(
    '[ng-spotlight] a source returned something that is neither SpotlightItem[] nor { groups: SpotlightGroup[] }',
  );
}
