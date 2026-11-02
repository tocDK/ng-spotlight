import { isSafeUrl } from './url';
import type { SpotlightBadge, SpotlightItem, SpotlightRecentEntry, SpotlightRecentStorage, SpotlightStoredAction } from './types';

const BADGE_TONES = new Set(['info', 'success', 'warn', 'danger']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRouteSegments(value: unknown): boolean {
  return Array.isArray(value) && value.every((segment) => typeof segment === 'string' || typeof segment === 'number');
}

function isBadge(value: unknown): value is SpotlightBadge {
  if (!isRecord(value) || typeof value['label'] !== 'string') return false;
  const tone = value['tone'];
  return tone === undefined || (typeof tone === 'string' && BADGE_TONES.has(tone));
}

/** Exactly one of route/url, each valid: unsafe URLs are dropped rather than replayed. */
function isStoredAction(value: unknown): value is SpotlightStoredAction {
  if (!isRecord(value)) return false;
  const hasRoute = 'route' in value;
  const hasUrl = 'url' in value;
  if (hasRoute === hasUrl) return false;
  if (hasRoute) return typeof value['route'] === 'string' || isRouteSegments(value['route']);
  return typeof value['url'] === 'string' && isSafeUrl(value['url']);
}

export function isRecentEntry(value: unknown): value is SpotlightRecentEntry {
  if (!isRecord(value)) return false;
  if (
    typeof value['id'] !== 'string' ||
    typeof value['title'] !== 'string' ||
    typeof value['group'] !== 'string' ||
    typeof value['sourceId'] !== 'string'
  ) {
    return false;
  }
  if (value['subtitle'] !== undefined && typeof value['subtitle'] !== 'string') return false;
  if (value['icon'] !== undefined && typeof value['icon'] !== 'string') return false;
  if (value['badges'] !== undefined && !(Array.isArray(value['badges']) && value['badges'].every(isBadge))) return false;
  return value['action'] === undefined || isStoredAction(value['action']);
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
