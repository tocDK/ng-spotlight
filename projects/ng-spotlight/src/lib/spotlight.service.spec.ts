import { createEnvironmentInjector, EnvironmentInjector, inject, InjectionToken, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, Subject, throwError } from 'rxjs';
import { provideSpotlight } from './provide-spotlight';
import { staticSource } from './sources/static-source';
import { SPOTLIGHT_HTTP_DEFAULTS } from './tokens';
import { SpotlightService, type SpotlightOption } from './spotlight.service';
import { flush, memoryRecent } from './testing.spec-util';
import type { SpotlightConfig, SpotlightRecentEntry, SpotlightRecentStorage, SpotlightSource } from './types';

let ran: string[] = [];

const commands = staticSource({
  group: 'Commands',
  items: [
    { id: 'dash', title: 'Dashboard', suggested: true, action: { route: '/dashboard' } },
    { id: 'docs', title: 'Documentation', action: { url: 'https://example.com/docs' } },
    { id: 'evil', title: 'Evil link', action: { url: 'java\nscript:alert(1)' } },
    { id: 'hello', title: 'Say hello', action: { run: () => void ran.push('hello') } },
  ],
});

function setup(config: SpotlightConfig = {}) {
  const errors: Array<{ error: unknown; source: string }> = [];
  const storage = memoryRecent();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideSpotlight({
        recent: { storage },
        onError: (error, source) => errors.push({ error, source: source.id }),
        sources: [commands],
        ...config,
      }),
    ],
  });
  const svc = TestBed.inject(SpotlightService);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { svc, errors, storage, navigate };
}

const titles = (svc: SpotlightService) => svc.options().map((o) => o.item?.title ?? `retry:${o.sourceId}`);

function opt(svc: SpotlightService, title: string): SpotlightOption {
  const found = svc.options().find((o) => o.item?.title === title);
  if (!found) throw new Error(`no option "${title}" in ${JSON.stringify(titles(svc))}`);
  return found;
}

beforeEach(() => {
  ran = [];
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('SpotlightService', () => {
  it('starts closed and opens with the suggested items', async () => {
    const { svc } = setup();
    expect(svc.isOpen()).toBe(false);
    svc.open();
    await flush();
    expect(svc.isOpen()).toBe(true);
    expect(titles(svc)).toEqual(['Dashboard']);
  });

  it('filters in the same tick as the query changes and pre-selects the first option', () => {
    const { svc } = setup();
    svc.open();
    svc.setQuery('doc');
    expect(titles(svc)).toEqual(['Documentation']);
    expect(svc.activeIndex()).toBe(0);
    expect(svc.activeOption()?.item?.id).toBe('docs');
  });

  it('open(query) while open only updates the query', () => {
    const { svc } = setup();
    svc.open();
    svc.open('dash');
    expect(svc.query()).toBe('dash');
    expect(titles(svc)).toEqual(['Dashboard']);
  });

  it('moves the active option with wrap-around and resets it when the query changes', () => {
    const { svc } = setup();
    svc.open();
    svc.setQuery('a');
    expect(titles(svc)).toEqual(['Dashboard', 'Documentation', 'Say hello']);
    svc.moveActive(1);
    expect(svc.activeIndex()).toBe(1);
    svc.moveActive(-2);
    expect(svc.activeIndex()).toBe(2);
    svc.moveActive(1);
    expect(svc.activeIndex()).toBe(0);
    svc.setActive(svc.options()[2].key);
    svc.setQuery('as');
    expect(svc.activeIndex()).toBe(0);
  });

  it('navigates a route item, stores it in Recent, closes and emits selected', async () => {
    const { svc, navigate, storage } = setup();
    const selected = firstValueFrom(svc.selected);
    svc.open();
    await flush();
    svc.setQuery('dash');
    await svc.select(opt(svc, 'Dashboard'));
    await flush();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(svc.isOpen()).toBe(false);
    expect((await selected).id).toBe('dash');
    expect(storage.saved.at(-1)).toEqual([
      { id: 'dash', title: 'Dashboard', group: 'Commands', sourceId: 'static:Commands', action: { route: '/dashboard' } },
    ]);
    svc.open();
    await flush();
    expect(svc.groups().map((g) => [g.id, g.label, g.items.map((i) => i.title)])).toEqual([['__recent', 'Recent', ['Dashboard']]]);
  });

  it('opens url items in a new tab with noopener when asked', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { svc } = setup();
    svc.open();
    svc.setQuery('docu');
    await svc.select(opt(svc, 'Documentation'), { newTab: true });
    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener');
  });

  it('blocks unsafe url schemes instead of navigating', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { svc, errors, storage } = setup();
    svc.open();
    svc.setQuery('evil');
    await svc.select(opt(svc, 'Evil link'), { newTab: true });
    await flush();
    expect(open).not.toHaveBeenCalled();
    expect(errors).toHaveLength(1);
    expect(String(errors[0].error)).toContain('unsafe scheme');
    expect(errors[0].source).toBe('static:Commands');
    expect(storage.saved).toEqual([]);
    expect(svc.isOpen()).toBe(false);
  });

  it('awaits run() before closing and ignores a second select meanwhile', async () => {
    let resolveRun: () => void = () => undefined;
    let runs = 0;
    const slow = staticSource({
      id: 'slow',
      group: 'Slow',
      items: [
        {
          id: 'wait',
          title: 'Wait for it',
          action: {
            run: () => {
              runs += 1;
              return new Promise<void>((resolve) => {
                resolveRun = resolve;
              });
            },
          },
        },
      ],
    });
    const { svc } = setup({ sources: [slow] });
    svc.open();
    svc.setQuery('wait');
    const option = opt(svc, 'Wait for it');
    const done = svc.select(option);
    await flush();
    void svc.select(option);
    expect(svc.isOpen()).toBe(true);
    resolveRun();
    await done;
    expect(svc.isOpen()).toBe(false);
    expect(runs).toBe(1);
  });

  it('reports a rejecting run() and keeps it out of Recent', async () => {
    const failing = staticSource({
      id: 'failing',
      group: 'Failing',
      items: [{ id: 'boom', title: 'Explode', action: { run: () => Promise.reject(new Error('kaboom')) } }],
    });
    const { svc, errors, storage } = setup({ sources: [failing] });
    let emitted = false;
    svc.selected.subscribe(() => (emitted = true));
    svc.open();
    svc.setQuery('expl');
    await svc.select(opt(svc, 'Explode'));
    await flush();
    expect(errors).toEqual([{ error: new Error('kaboom'), source: 'failing' }]);
    expect(storage.saved).toEqual([]);
    expect(svc.isOpen()).toBe(false);
    expect(emitted).toBe(false);
  });

  it('stores run() items by id and resolves them through their source on the next open', async () => {
    const storage = memoryRecent([
      { id: 'hello', title: 'Say hello', group: 'Commands', sourceId: 'static:Commands' },
      { id: 'ghost', title: 'Ghost', group: 'Gone', sourceId: 'removed-source' },
    ]);
    const { svc } = setup({ recent: { storage } });
    svc.open();
    await flush();
    expect(svc.groups()[0].items.map((i) => i.title)).toEqual(['Say hello']);
    await svc.select(svc.options()[0]);
    expect(ran).toEqual(['hello']);
  });

  it('survives a recent storage that rejects, throws or returns garbage', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken: SpotlightRecentStorage = {
      load: () => Promise.reject(new Error('blocked')),
      save: () => {
        throw new Error('quota');
      },
    };
    const { svc, navigate } = setup({ recent: { storage: broken } });
    svc.open();
    await flush();
    expect(titles(svc)).toEqual(['Dashboard']);
    svc.setQuery('dash');
    await svc.select(opt(svc, 'Dashboard'));
    await flush();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(warn).toHaveBeenCalledTimes(2);

    TestBed.resetTestingModule();
    const garbage: SpotlightRecentStorage = {
      load: () => Promise.resolve([{ foo: 1 }, null, 'x'] as unknown as SpotlightRecentEntry[]),
      save: () => Promise.resolve(),
    };
    const second = setup({ recent: { storage: garbage } });
    second.svc.open();
    await flush();
    expect(second.svc.groups().map((g) => g.id)).toEqual(['Commands']);
  });

  it('shows a retry option for a failing source and re-runs it', async () => {
    let fail = true;
    const remote: SpotlightSource = {
      id: 'remote',
      group: 'Remote',
      search: () => (fail ? throwError(() => new Error('503')) : [{ id: 'r1', title: 'Recovered', group: 'Remote', action: { route: '/r1' } }]),
    };
    const { svc, errors } = setup({ sources: [remote] });
    svc.open();
    svc.setQuery('rec');
    expect(titles(svc)).toEqual(['retry:remote']);
    expect(errors.map((e) => e.source)).toContain('remote');
    fail = false;
    await svc.select(svc.options()[0]);
    expect(titles(svc)).toEqual(['Recovered']);
  });

  it('cycles chips and narrows the results to the chip group', () => {
    const pages = staticSource({ group: 'Pages', items: [{ id: 'p-docs', title: 'Docs home', action: { route: '/docs' } }] });
    const { svc } = setup({ sources: [commands, pages] });
    svc.open();
    svc.setQuery('do');
    expect(svc.chips().map((c) => c.label)).toEqual(['All', 'Commands', 'Pages']);
    svc.cycleChip(1);
    expect(svc.chip()).toBe('Commands');
    expect(new Set(svc.options().map((o) => o.groupKey))).toEqual(new Set(['static:Commands::Commands']));
    expect(svc.chips().map((c) => c.label)).toEqual(['All', 'Commands', 'Pages']);
    svc.cycleChip(-1);
    expect(svc.chip()).toBeNull();
    svc.cycleChip(-1);
    expect(svc.chip()).toBe('Pages');
  });

  it('announces the number of results', () => {
    const { svc } = setup();
    svc.open();
    svc.setQuery('do');
    expect(svc.announcement()).toBe('2 results');
  });

  it('adds sources from a child injector and removes them when it is destroyed', () => {
    const { svc } = setup();
    const child = createEnvironmentInjector(
      [provideSpotlight({ sources: [staticSource({ group: 'Admin', items: [{ id: 'users', title: 'Users', action: { route: '/admin/users' } }] })] })],
      TestBed.inject(EnvironmentInjector),
    );
    expect(child.get(SpotlightService)).toBe(svc);
    svc.open();
    svc.setQuery('users');
    expect(titles(svc)).toContain('Users');
    child.destroy();
    expect(titles(svc)).not.toContain('Users');
  });

  it('forgets resolved run() items of a destroyed child source', async () => {
    const storage = memoryRecent([{ id: 'ping', title: 'Ping', group: 'Admin', sourceId: 'admin-src' }]);
    const { svc } = setup({ recent: { storage } });
    const child = createEnvironmentInjector(
      [provideSpotlight({ sources: [staticSource({ id: 'admin-src', group: 'Admin', items: [{ id: 'ping', title: 'Ping', action: { run: () => undefined } }] })] })],
      TestBed.inject(EnvironmentInjector),
    );
    svc.open();
    await flush();
    expect(svc.groups()[0].items.map((i) => i.title)).toEqual(['Ping']);
    child.destroy();
    expect(svc.groups().map((g) => g.id)).not.toContain('__recent');
  });

  it('never exposes the previous query\'s rows while the next query loads', async () => {
    const pending = new Subject<never[]>();
    const slow: SpotlightSource = {
      id: 'slow',
      group: 'Slow',
      search: (q) => (q === 'alpha' ? [{ id: 'a1', title: 'Alpha one', group: 'Slow', action: { run: () => void ran.push('a1') } }] : pending),
    };
    const { svc } = setup({ sources: [slow] });
    svc.open();
    svc.setQuery('alpha');
    await flush();
    expect(titles(svc)).toContain('Alpha one');
    svc.setQuery('beta');
    expect(svc.loading()).toBe(true);
    expect(titles(svc)).not.toContain('Alpha one');
    expect(svc.options().filter((o) => o.sourceId === 'slow')).toEqual([]);
    expect(svc.announcement()).toBe(svc.texts.resultsAnnouncement(svc.options().length));
    const active = svc.activeOption();
    if (active) await svc.select(active);
    expect(ran).toEqual([]);
  });

  it('keeps same-id Recent entries from different sources distinct', async () => {
    const storage = memoryRecent([
      { id: 'same', title: 'First', group: 'A', sourceId: 'src-a', action: { route: '/a' } },
      { id: 'same', title: 'Second', group: 'B', sourceId: 'src-b', action: { route: '/b' } },
    ]);
    const { svc } = setup({ recent: { storage } });
    svc.open();
    await flush();
    const recent = svc.options().filter((o) => o.groupKey === '__recent');
    expect(recent.map((o) => o.key)).toEqual(['__recent::src-a::same', '__recent::src-b::same']);
    expect(svc.activeOption()?.item?.title).toBe('First');
    svc.moveActive(1);
    expect(svc.activeOption()?.item?.title).toBe('Second');
  });

  it('does not query minLength sources just to resolve Recent run() entries', async () => {
    const calls: string[] = [];
    const remote: SpotlightSource = { id: 'remote', group: 'Remote', minLength: 2, search: (q) => (calls.push(q), []) };
    const storage = memoryRecent([{ id: 'r', title: 'R', group: 'Remote', sourceId: 'remote' }]);
    const { svc } = setup({ sources: [remote], recent: { storage } });
    svc.open();
    await flush();
    expect(calls).toEqual([]);
  });

  it('provides http defaults per injector, a child overriding its parent', () => {
    const mapParent = () => [];
    const mapChild = () => [];
    setup({ http: { map: mapParent } });
    const parent = TestBed.inject(EnvironmentInjector);
    expect(parent.get(SPOTLIGHT_HTTP_DEFAULTS)).toEqual({ map: mapParent });
    const child = createEnvironmentInjector([provideSpotlight({ http: { map: mapChild } })], parent);
    expect(child.get(SPOTLIGHT_HTTP_DEFAULTS)).toEqual({ map: mapChild });
    const plain = createEnvironmentInjector([provideSpotlight()], parent);
    expect(plain.get(SPOTLIGHT_HTTP_DEFAULTS)).toEqual({ map: mapParent });
    plain.destroy();
    child.destroy();
  });

  it('creates a separate instance when isolated', () => {
    const { svc } = setup();
    const child = createEnvironmentInjector([provideSpotlight({ isolated: true })], TestBed.inject(EnvironmentInjector));
    expect(child.get(SpotlightService)).not.toBe(svc);
    child.destroy();
  });

  it('accepts a config factory that runs in an injection context', () => {
    const PLACEHOLDER = new InjectionToken<string>('PLACEHOLDER', { factory: () => 'Find anything' });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideSpotlight(() => ({ texts: { placeholder: inject(PLACEHOLDER) } }))],
    });
    expect(TestBed.inject(SpotlightService).texts.placeholder()).toBe('Find anything');
  });

  it('rejects an invalid hotkey at configuration time', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideSpotlight({ hotkeys: ['hyper.k'] })],
    });
    expect(() => TestBed.inject(SpotlightService)).toThrow(/unknown modifier "hyper"/);
  });

  it('close() resets the query, chip and results', () => {
    const { svc } = setup();
    svc.open('dash');
    svc.close();
    expect(svc.query()).toBe('');
    expect(svc.chip()).toBeNull();
    expect(svc.options()).toEqual([]);
  });
});
