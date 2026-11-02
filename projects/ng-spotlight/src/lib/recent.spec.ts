import { entryToItem, isRecentEntry, localStorageRecent, pushRecent, toRecentEntry } from './recent';
import type { SpotlightItem, SpotlightRecentEntry } from './types';

const entry = (id: string, sourceId = 's'): SpotlightRecentEntry => ({ id, title: id, group: 'g', sourceId, action: { route: `/${id}` } });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('localStorageRecent', () => {
  it('round-trips entries under a namespaced key', async () => {
    const storage = localStorageRecent('app');
    await storage.save([entry('a'), entry('b')]);
    expect(localStorage.getItem('ng-spotlight:recent:app')).not.toBeNull();
    expect(await storage.load()).toEqual([entry('a'), entry('b')]);
  });

  it('returns [] when nothing is stored', async () => {
    expect(await localStorageRecent('empty').load()).toEqual([]);
  });

  it('localStorageRecent survives blocked storage and foreign data', async () => {
    const storage = localStorageRecent('app');
    localStorage.setItem('ng-spotlight:recent:app', '{not json');
    expect(await storage.load()).toEqual([]);
    localStorage.setItem('ng-spotlight:recent:app', JSON.stringify({ items: [] }));
    expect(await storage.load()).toEqual([]);
    localStorage.setItem('ng-spotlight:recent:app', JSON.stringify([entry('ok'), { id: 1 }, null, 'x', { id: 'no-source', title: 't', group: 'g' }]));
    expect(await storage.load()).toEqual([entry('ok')]);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(await storage.load()).toEqual([]);
    await expect(storage.save([entry('a')])).resolves.toBeUndefined();
  });
});

describe('recent helpers', () => {
  const run = vi.fn();
  const routeItem: SpotlightItem = {
    id: 'cust',
    title: 'Customers',
    subtitle: '/customers',
    icon: 'pi pi-users',
    group: 'Pages',
    keywords: ['clients'],
    badges: [{ label: 'new' }],
    suggested: true,
    data: { big: 'payload' },
    action: { route: '/customers' },
  };

  it('stores only what is needed to re-render and re-run route and url items', () => {
    expect(toRecentEntry(routeItem, 'routes')).toEqual({
      id: 'cust',
      title: 'Customers',
      group: 'Pages',
      sourceId: 'routes',
      subtitle: '/customers',
      icon: 'pi pi-users',
      badges: [{ label: 'new' }],
      action: { route: '/customers' },
    });
    expect(toRecentEntry({ id: 'u', title: 'U', group: 'g', action: { url: 'https://x.dk', newTab: true } }, 's').action).toEqual({
      url: 'https://x.dk',
      newTab: true,
    });
  });

  it('stores run() items without an action', () => {
    const stored = toRecentEntry({ id: 'logout', title: 'Log out', group: 'Commands', action: { run } }, 'cmd');
    expect(stored).toEqual({ id: 'logout', title: 'Log out', group: 'Commands', sourceId: 'cmd' });
    expect(entryToItem(stored)).toBeNull();
  });

  it('turns a stored route entry back into an item', () => {
    expect(entryToItem(entry('a'))).toEqual({ id: 'a', title: 'a', group: 'g', action: { route: '/a' } });
  });

  it('pushes most-recent-first, de-duplicates by source and id, and caps the list', () => {
    let list: SpotlightRecentEntry[] = [];
    list = pushRecent(list, entry('a'), 3);
    list = pushRecent(list, entry('b'), 3);
    list = pushRecent(list, entry('a'), 3);
    list = pushRecent(list, entry('a', 'other'), 3);
    list = pushRecent(list, entry('c'), 3);
    expect(list.map((e) => `${e.sourceId}:${e.id}`)).toEqual(['s:c', 'other:a', 's:a']);
  });

  it('validates entries', () => {
    expect(isRecentEntry(entry('a'))).toBe(true);
    expect(isRecentEntry({ ...entry('a'), action: { run: 'x' } })).toBe(false);
    expect(isRecentEntry({ id: 'a', title: 'a', group: 'g' })).toBe(false);
  });
});

describe('isRecentEntry rejects malformed or unsafe stored data', () => {
  it.each([
    ['subtitle that is not a string', { ...entry('a'), subtitle: 5 }, false],
    ['icon that is not a string', { ...entry('a'), icon: ['x'] }, false],
    ['badges that are not an array', { ...entry('a'), badges: { label: 'x' } }, false],
    ['a badge without a string label', { ...entry('a'), badges: [{ tone: 'info' }] }, false],
    ['a badge with an unknown tone', { ...entry('a'), badges: [{ label: 'x', tone: 'loud' }] }, false],
    ['a badge with a known tone', { ...entry('a'), badges: [{ label: 'x', tone: 'warn' }] }, true],
    ['a badge without a tone', { ...entry('a'), badges: [{ label: 'x' }] }, true],
    ['a route array with an object segment', { ...entry('a'), action: { route: ['a', {}] } }, false],
    ['a route array with string and number segments', { ...entry('a'), action: { route: ['a', 2] } }, true],
    ['a url action with a javascript: scheme', { ...entry('a'), action: { url: 'javascript:alert(1)' } }, false],
    ['a url action with https', { ...entry('a'), action: { url: 'https://x.dk' } }, true],
    ['an action with both route and url', { ...entry('a'), action: { route: '/a', url: 'https://x.dk' } }, false],
  ])('%s -> %s', (_name, value, expected) => {
    expect(isRecentEntry(value)).toBe(expected);
  });

  it('drops malformed entries from load()', async () => {
    localStorage.setItem(
      'ng-spotlight:recent:app',
      JSON.stringify([entry('ok'), { ...entry('bad'), action: { url: 'javascript:alert(1)' } }]),
    );
    expect(await localStorageRecent('app').load()).toEqual([entry('ok')]);
  });
});

