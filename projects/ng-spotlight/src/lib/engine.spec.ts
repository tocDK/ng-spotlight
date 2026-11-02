import { Injector } from '@angular/core';
import { BehaviorSubject, map, NEVER, Observable, of, Subject, throwError, timer } from 'rxjs';
import {
  createSearchEngine,
  planQuery,
  sortSources,
  type SpotlightGroupState,
  type SpotlightQueryState,
  type SpotlightRegisteredSource,
} from './engine';
import type { SpotlightItem, SpotlightResult, SpotlightSource } from './types';

const item = (id: string, title: string, group: string, extra: Partial<SpotlightItem> = {}): SpotlightItem => ({
  id,
  title,
  group,
  action: { route: `/${id}` },
  ...extra,
});

const regsOf = (sources: SpotlightSource[]): SpotlightRegisteredSource[] =>
  sources.map((source, order) => ({ source, injector: Injector.NULL, order }));

function harness(sources: SpotlightSource[]) {
  const input = new BehaviorSubject<SpotlightQueryState>({ query: '', chip: null });
  const retry = new Subject<string>();
  const errors: string[] = [];
  const emissions: SpotlightGroupState[][] = [];
  const sub = createSearchEngine({
    sources: regsOf(sources),
    input$: input,
    retry$: retry,
    recentIds: () => new Set<string>(),
    onError: (_error, source) => errors.push(source.id),
  }).subscribe((groups) => emissions.push(groups));
  const latest = () => emissions.at(-1) ?? [];
  const titles = () => latest().flatMap((g) => g.items.map((i) => i.title));
  const set = (query: string, chip: string | null = null) => input.next({ query, chip });
  return { retry, errors, emissions, sub, latest, titles, set };
}

const pages: SpotlightSource = {
  id: 'pages',
  group: 'Pages',
  local: true,
  search: () => [
    item('cust', 'Customers', 'Pages', { suggested: true }),
    item('ord', 'Orders', 'Pages'),
    item('set', 'Settings', 'Pages', { keywords: ['preferences'] }),
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('planQuery', () => {
  const orders: SpotlightSource = { id: 'orders', prefix: '#', search: () => [] };
  const cmd: SpotlightSource = { id: 'cmd', prefix: '>', search: () => [] };
  const cmd2: SpotlightSource = { id: 'cmd2', prefix: '>>', search: () => [] };
  const regs = regsOf([pages, orders, cmd, cmd2]);

  it('trims and strips a registered prefix', () => {
    expect(planQuery(regs, '  #12 ')).toEqual({ query: '12', only: orders });
    expect(planQuery(regs, ' plain ')).toEqual({ query: 'plain', only: null });
  });

  it('lets the longest prefix win', () => {
    expect(planQuery(regs, '>>x').only).toBe(cmd2);
    expect(planQuery(regs, '>x').only).toBe(cmd);
  });
});

describe('sortSources', () => {
  it('orders by priority, then registration order', () => {
    const a: SpotlightSource = { id: 'a', search: () => [] };
    const b: SpotlightSource = { id: 'b', priority: 0, search: () => [] };
    const c: SpotlightSource = { id: 'c', search: () => [] };
    expect(sortSources(regsOf([a, b, c])).map((r) => r.source.id)).toEqual(['a', 'b', 'c']);
    const d: SpotlightSource = { id: 'd', priority: -1, search: () => [] };
    expect(sortSources(regsOf([a, b, c, d])).map((r) => r.source.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});

describe('createSearchEngine', () => {
  it('emits local results in the same tick as the keystroke', () => {
    const h = harness([pages]);
    h.set('ord');
    expect(h.titles()).toEqual(['Orders']);
  });

  it('ranks local sources (keywords at lower weight) and keeps the order of other sources', () => {
    const remote: SpotlightSource = { id: 'remote', group: 'Remote', search: () => [item('b', 'Beta', 'Remote'), item('a', 'Alpha', 'Remote')] };
    const h = harness([pages, remote]);
    h.set('s');
    expect(h.titles()).toEqual(['Settings', 'Customers', 'Orders', 'Beta', 'Alpha']);
    h.set('pref');
    expect(h.titles()).toEqual(['Settings', 'Beta', 'Alpha']);
  });

  it('shows only suggested items on the empty query', () => {
    const h = harness([pages]);
    expect(h.titles()).toEqual(['Customers']);
    h.set('   ');
    expect(h.titles()).toEqual(['Customers']);
  });

  it('runs only the prefixed source and strips the prefix; an empty remainder lists everything', () => {
    const seen: string[] = [];
    const orders: SpotlightSource = {
      id: 'orders',
      group: 'Orders',
      prefix: '#',
      local: true,
      search: (query) => {
        seen.push(query);
        return [item('1001', 'Order 1001', 'Orders'), item('1002', 'Order 1002', 'Orders')];
      },
    };
    const h = harness([pages, orders]);
    h.set('#1001');
    expect(h.titles()).toEqual(['Order 1001']);
    expect(seen.at(-1)).toBe('1001');
    h.set('#');
    expect(h.titles()).toEqual(['Order 1001', 'Order 1002']);
    h.set('ord');
    expect(h.titles()).toEqual(['Orders', 'Order 1001', 'Order 1002']);
  });

  it('respects minLength', () => {
    const calls: string[] = [];
    const remote: SpotlightSource = { id: 'r', group: 'R', minLength: 2, search: (q) => (calls.push(q), [item('x', 'X', 'R')]) };
    const h = harness([remote]);
    h.set('a');
    expect(calls).toEqual([]);
    h.set('ab');
    expect(calls).toEqual(['ab']);
  });

  it('debounces per source', () => {
    const calls: string[] = [];
    const remote: SpotlightSource = { id: 'r', group: 'R', debounceMs: 150, search: (q) => (calls.push(q), [item(q, q, 'R')]) };
    const h = harness([remote]);
    h.set('ab');
    vi.advanceTimersByTime(149);
    h.set('abc');
    vi.advanceTimersByTime(149);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual(['abc']);
    expect(h.titles()).toEqual(['abc']);
  });

  it('never renders a stale response and aborts the superseded request', () => {
    const signals: AbortSignal[] = [];
    const slow: SpotlightSource = {
      id: 'slow',
      group: 'Slow',
      minLength: 1,
      search: (q, ctx) => {
        signals.push(ctx.signal);
        return timer(q === 'a' ? 300 : 100).pipe(map(() => [item(q, `result ${q}`, 'Slow')]));
      },
    };
    const h = harness([slow]);
    h.set('a');
    vi.advanceTimersByTime(50);
    h.set('ab');
    vi.advanceTimersByTime(500);
    const everRendered = h.emissions.flatMap((groups) => groups.flatMap((g) => g.items.map((i) => i.title)));
    expect(everRendered).not.toContain('result a');
    expect(h.titles()).toEqual(['result ab']);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('resolves promise results', async () => {
    const promised: SpotlightSource = { id: 'p', group: 'P', search: () => Promise.resolve([item('x', 'From promise', 'P')]) };
    const h = harness([promised]);
    h.set('x');
    await vi.advanceTimersByTimeAsync(1);
    expect(h.titles()).toEqual(['From promise']);
  });

  it('turns a timeout into an error group and reports it', () => {
    const hang: SpotlightSource = { id: 'hang', group: 'Hang', timeoutMs: 1000, search: () => NEVER };
    const h = harness([hang]);
    h.set('x');
    vi.advanceTimersByTime(999);
    expect(h.latest()[0]).toMatchObject({ id: 'Hang', loading: true, error: null });
    vi.advanceTimersByTime(1);
    expect(h.latest()[0]).toMatchObject({ id: 'Hang', loading: false, items: [] });
    expect(h.latest()[0].error).toBeInstanceOf(Error);
    expect(h.errors).toEqual(['hang']);
  });

  it('isolates a throwing source to its own group', () => {
    const broken: SpotlightSource = {
      id: 'broken',
      group: 'Broken',
      search: () => {
        throw new Error('boom');
      },
    };
    const h = harness([pages, broken]);
    h.set('cust');
    expect(h.latest().map((g) => [g.id, g.items.length, g.error !== null])).toEqual([
      ['Pages', 1, false],
      ['Broken', 0, true],
    ]);
    expect(h.errors).toEqual(['broken', 'broken']);
  });

  it('isolates malformed payloads to their own group', () => {
    const bad: SpotlightSource = { id: 'bad', group: 'Bad', search: () => ({ groups: null }) as unknown as SpotlightResult };
    const half: SpotlightSource = {
      id: 'half',
      search: () =>
        ({
          groups: [
            { id: 'g', label: 'G', items: [{ id: 'no-title' }, null, item('fine', 'Fine', 'g'), { ...item('kid', 'Kid', 'g'), children: [] }] },
            { label: 'no id', items: [] },
          ],
        }) as unknown as SpotlightResult,
    };
    const h = harness([bad, half]);
    h.set('q');
    expect(h.latest().map((g) => [g.id, g.items.map((i) => i.title), g.error !== null])).toEqual([
      ['Bad', [], true],
      ['g', ['Fine'], false],
    ]);
  });

  it('re-runs one source on retry', () => {
    let fail = true;
    const flaky: SpotlightSource = {
      id: 'flaky',
      group: 'Flaky',
      search: () => (fail ? throwError(() => new Error('down')) : of([item('ok', 'Back online', 'Flaky')])),
    };
    const h = harness([flaky]);
    h.set('b');
    expect(h.latest()[0].error).not.toBeNull();
    fail = false;
    h.retry.next('other');
    expect(h.latest()[0].error).not.toBeNull();
    h.retry.next('flaky');
    expect(h.titles()).toEqual(['Back online']);
  });

  it('orders groups by priority and keeps a loading placeholder so later answers do not jump', () => {
    const late: SpotlightSource = { id: 'late', group: 'Late', priority: 0, search: () => timer(100).pipe(map(() => [item('l', 'Late item', 'Late')])) };
    const early: SpotlightSource = { id: 'early', group: 'Early', priority: 1, search: () => [item('e', 'Early item', 'Early')] };
    const h = harness([early, late]);
    h.set('x');
    expect(h.latest().map((g) => [g.id, g.loading])).toEqual([
      ['Late', true],
      ['Early', false],
    ]);
    vi.advanceTimersByTime(100);
    expect(h.latest().map((g) => [g.id, g.loading])).toEqual([
      ['Late', false],
      ['Early', false],
    ]);
  });

  it('with a chip active runs only the sources feeding that group', () => {
    const pageCalls = vi.fn();
    const tracked: SpotlightSource = { ...pages, search: (q, c) => (pageCalls(q), pages.search(q, c)) };
    const commands: SpotlightSource = { id: 'cmd', group: 'Commands', local: true, search: () => [item('logout', 'Log out', 'Commands')] };
    const h = harness([tracked, commands]);
    pageCalls.mockClear();
    h.set('o', 'Commands');
    expect(h.titles()).toEqual(['Log out']);
    expect(pageCalls).not.toHaveBeenCalled();
  });

  it('learns the groups of a multi-group source and passes the chip to it', () => {
    const chips: Array<string | null> = [];
    const multi: SpotlightSource = {
      id: 'multi',
      search: (_q, ctx) => {
        chips.push(ctx.chip);
        return {
          groups: [
            { id: 'customers', label: 'Customers', items: [item('c1', 'Acme', 'customers')] },
            { id: 'orders', label: 'Orders', items: [item('o1', 'Order 1', 'orders')] },
          ],
        };
      },
    };
    const h = harness([multi]);
    h.set('a');
    h.set('a', 'orders');
    expect(h.latest().map((g) => [g.id, g.label])).toEqual([['orders', 'Orders']]);
    expect(h.titles()).toEqual(['Order 1']);
    expect(chips.at(-1)).toBe('orders');
  });

  it('unsubscribes a superseded observable source (signal-ignoring sources such as httpSource)', () => {
    let active = 0;
    const cold: SpotlightSource = {
      id: 'cold',
      group: 'Cold',
      search: () =>
        new Observable<SpotlightResult>(() => {
          active++;
          return () => {
            active--;
          };
        }),
    };
    const h = harness([cold]);
    h.set('a');
    expect(active).toBe(1);
    h.set('ab');
    expect(active).toBe(1);
    h.sub.unsubscribe();
    expect(active).toBe(0);
  });

  it('treats explicit undefined options as defaults', () => {
    const calls: string[] = [];
    const remote: SpotlightSource = {
      id: 'r',
      group: 'R',
      minLength: undefined,
      debounceMs: undefined,
      timeoutMs: undefined,
      search: (q) => (calls.push(q), [item('x', 'X', 'R')]),
    };
    const h = harness([remote]);
    h.set('a');
    expect(calls).toContain('a');
    expect(h.titles()).toEqual(['X']);
  });

  it('falls back to the 5000 ms timeout when timeoutMs is undefined', () => {
    const hang: SpotlightSource = { id: 'hang', group: 'Hang', timeoutMs: undefined, search: () => NEVER };
    const h = harness([hang]);
    h.set('x');
    vi.advanceTimersByTime(4999);
    expect(h.latest()[0]).toMatchObject({ loading: true, error: null });
    vi.advanceTimersByTime(1);
    expect(h.latest()[0]).toMatchObject({ loading: false, items: [] });
    expect(h.latest()[0].error).toBeInstanceOf(Error);
  });

  it('shows an error row for a group-less source that throws before its first answer', () => {
    const broken: SpotlightSource = {
      id: 'nogroup',
      search: () => {
        throw new Error('boom');
      },
    };
    const h = harness([broken]);
    h.set('x');
    expect(h.latest()).toHaveLength(1);
    expect(h.latest()[0]).toMatchObject({ id: 'nogroup', sourceId: 'nogroup', loading: false, items: [] });
    expect(h.latest()[0].error).toBeInstanceOf(Error);
  });

  it('shows a loading placeholder for a group-less source that hangs on its first call', () => {
    const hang: SpotlightSource = { id: 'nogroup', search: () => NEVER };
    const h = harness([hang]);
    h.set('x');
    expect(h.latest()).toHaveLength(1);
    expect(h.latest()[0]).toMatchObject({ id: 'nogroup', loading: true, error: null, items: [] });
  });

  it('isolates a throwing onError callback', () => {
    const broken: SpotlightSource = {
      id: 'broken',
      group: 'Broken',
      search: () => {
        throw new Error('boom');
      },
    };
    const emissions: SpotlightGroupState[][] = [];
    const input = new BehaviorSubject<SpotlightQueryState>({ query: 'cust', chip: null });
    const sub = createSearchEngine({
      sources: regsOf([pages, broken]),
      input$: input,
      retry$: new Subject<string>(),
      recentIds: () => new Set<string>(),
      onError: () => {
        throw new Error('consumer bug');
      },
    }).subscribe((g) => emissions.push(g));
    const last = emissions.at(-1) ?? [];
    expect(last.map((g) => [g.id, g.items.length, g.error !== null])).toEqual([
      ['Pages', 1, false],
      ['Broken', 0, true],
    ]);
    sub.unsubscribe();
  });
});
