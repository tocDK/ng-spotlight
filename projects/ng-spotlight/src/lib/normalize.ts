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

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isValidBadge(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const badge = value as Record<string, unknown>;
  if (typeof badge['label'] !== 'string') return false;
  const tone = badge['tone'];
  return tone === undefined || tone === 'info' || tone === 'success' || tone === 'warn' || tone === 'danger';
}

/**
 * id and title are non-empty strings, the action is usable, optional fields have the right
 * shape and the reserved `children` key is absent (even when its value is undefined).
 */
export function isValidItem(value: unknown): value is SpotlightItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  if (
    typeof item['id'] !== 'string' ||
    item['id'] === '' ||
    typeof item['title'] !== 'string' ||
    !isValidAction(item['action']) ||
    'children' in item
  ) {
    return false;
  }
  if (!isOptionalString(item['subtitle']) || !isOptionalString(item['icon'])) return false;
  const keywords = item['keywords'];
  if (keywords !== undefined && !(Array.isArray(keywords) && keywords.every((k) => typeof k === 'string'))) {
    return false;
  }
  const badges = item['badges'];
  if (badges !== undefined && !(Array.isArray(badges) && badges.every(isValidBadge))) return false;
  const suggested = item['suggested'];
  return suggested === undefined || typeof suggested === 'boolean';
}

/** Optional item fields that JSON backends commonly send as `null` to mean "absent". */
const NULLABLE_FIELDS = ['subtitle', 'icon', 'keywords', 'badges', 'suggested', 'data'] as const;

/** Strips `null` optional fields, then validates. Returns null for an invalid item. */
function toItem(value: unknown): SpotlightItem | null {
  if (typeof value !== 'object' || value === null) return null;
  let candidate = value as Record<string, unknown>;
  if (NULLABLE_FIELDS.some((key) => candidate[key] === null)) {
    candidate = { ...candidate };
    for (const key of NULLABLE_FIELDS) if (candidate[key] === null) delete candidate[key];
  }
  return isValidItem(candidate) ? candidate : null;
}

/**
 * Turns whatever a source returned into validated groups. Invalid items and groups are
 * dropped, `null` optional fields count as absent, and a later item whose `group::id` was
 * already seen is dropped (ids must be unique per group). Grouped responses that repeat a
 * group id merge into the first group with that id. A value that is not a result at all
 * throws SpotlightResultError, which the engine turns into an error row for that source only.
 */
export function normalizeResult(result: unknown, fallbackGroup: string): NormalizedGroup[] {
  const byGroup = new Map<string, NormalizedGroup>();
  const seen = new Set<string>();
  const add = (group: NormalizedGroup, raw: unknown): void => {
    const item = toItem(raw);
    if (item === null) return;
    const key = `${group.id}::${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    group.items.push({ ...item, group: group.id });
  };
  if (Array.isArray(result)) {
    for (const raw of result as unknown[]) {
      const rawGroup = (raw as { group?: unknown } | null)?.group;
      const id = typeof rawGroup === 'string' && rawGroup !== '' ? rawGroup : fallbackGroup;
      let group = byGroup.get(id);
      if (!group) {
        group = { id, label: id, items: [] };
        byGroup.set(id, group);
      }
      add(group, raw);
    }
    return [...byGroup.values()].filter((g) => g.items.length > 0);
  }
  if (isSpotlightResponse(result)) {
    for (const rawGroup of result.groups as unknown[]) {
      if (typeof rawGroup !== 'object' || rawGroup === null) continue;
      const g = rawGroup as Record<string, unknown>;
      const id = g['id'];
      if (typeof id !== 'string' || id === '') continue;
      let group = byGroup.get(id);
      if (!group) {
        group = { id, label: typeof g['label'] === 'string' ? g['label'] : id, items: [] };
        const total = g['total'];
        if (typeof total === 'number' && Number.isInteger(total) && total >= 0) group.total = total;
        byGroup.set(id, group);
      }
      const rawItems: unknown[] = Array.isArray(g['items']) ? (g['items'] as unknown[]) : [];
      for (const raw of rawItems) add(group, raw);
    }
    return [...byGroup.values()];
  }
  throw new SpotlightResultError(
    '[ng-spotlight] a source returned something that is neither SpotlightItem[] nor { groups: SpotlightGroup[] }',
  );
}
