import type { SpotlightItem, SpotlightRecentEntry, SpotlightRecentStorage, SpotlightStoredAction } from './types';

function isStoredAction(value: unknown): value is SpotlightStoredAction {
  if (typeof value !== 'object' || value === null) return false;
  const action = value as Record<string, unknown>;
  return typeof action['route'] === 'string' || Array.isArray(action['route']) || typeof action['url'] === 'string';
}

export function isRecentEntry(value: unknown): value is SpotlightRecentEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry['id'] === 'string' &&
    typeof entry['title'] === 'string' &&
    typeof entry['group'] === 'string' &&
    typeof entry['sourceId'] === 'string' &&
    (entry['action'] === undefined || isStoredAction(entry['action']))
  );
}

/**
 * Recent items in localStorage under `ng-spotlight:recent:<key>`. Every access is wrapped
 * in try/catch, so the palette still works when storage is blocked, full or corrupted.
 */
export function localStorageRecent(key: string): SpotlightRecentStorage {
  const storageKey = `ng-spotlight:recent:${key}`;
  return {
    load(): Promise<SpotlightRecentEntry[]> {
      try {
        const raw = globalThis.localStorage?.getItem(storageKey);
        if (!raw) return Promise.resolve([]);
        const parsed: unknown = JSON.parse(raw);
        return Promise.resolve(Array.isArray(parsed) ? (parsed as unknown[]).filter(isRecentEntry) : []);
      } catch {
        return Promise.resolve([]);
      }
    },
    save(items: SpotlightRecentEntry[]): Promise<void> {
      try {
        globalThis.localStorage?.setItem(storageKey, JSON.stringify(items));
      } catch {
        // Blocked or full storage: Recent simply isn't persisted.
      }
      return Promise.resolve();
    },
  };
}

/** Keeps only the fields needed to re-render the item and re-run a route or url action. */
export function toRecentEntry(item: SpotlightItem, sourceId: string): SpotlightRecentEntry {
  const entry: SpotlightRecentEntry = { id: item.id, title: item.title, group: item.group, sourceId };
  if (item.subtitle !== undefined) entry.subtitle = item.subtitle;
  if (item.icon !== undefined) entry.icon = item.icon;
  if (item.badges !== undefined) entry.badges = item.badges;
  const action = item.action;
  if ('route' in action) entry.action = { route: action.route };
  else if ('url' in action) entry.action = action.newTab ? { url: action.url, newTab: true } : { url: action.url };
  return entry;
}

/** A stored route/url entry as an item; null for run() entries (resolve those through the source). */
export function entryToItem(entry: SpotlightRecentEntry): SpotlightItem | null {
  if (entry.action === undefined) return null;
  const item: SpotlightItem = { id: entry.id, title: entry.title, group: entry.group, action: entry.action };
  if (entry.subtitle !== undefined) item.subtitle = entry.subtitle;
  if (entry.icon !== undefined) item.icon = entry.icon;
  if (entry.badges !== undefined) item.badges = entry.badges;
  return item;
}

/** Most recent first, unique per source + id, at most `max` entries. */
export function pushRecent(
  list: readonly SpotlightRecentEntry[],
  entry: SpotlightRecentEntry,
  max: number,
): SpotlightRecentEntry[] {
  const rest = list.filter((e) => !(e.id === entry.id && e.sourceId === entry.sourceId));
  return [entry, ...rest].slice(0, Math.max(0, max));
}
