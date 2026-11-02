import { isSpotlightResponse, normalizeResult, SpotlightResultError } from './normalize';
import type { SpotlightItem } from './types';

const item = (id: string, group: string, extra: Partial<SpotlightItem> = {}): SpotlightItem => ({
  id,
  title: `Title ${id}`,
  group,
  action: { route: `/${id}` },
  ...extra,
});

describe('normalizeResult', () => {
  it('groups a flat array by item.group in order of first appearance, label = group id', () => {
    const groups = normalizeResult(
      [item('1', 'Pages'), item('2', 'Commands'), item('3', 'Pages')],
      'fallback',
    );
    expect(groups.map((g) => [g.id, g.label, g.items.map((i) => i.id)])).toEqual([
      ['Pages', 'Pages', ['1', '3']],
      ['Commands', 'Commands', ['2']],
    ]);
  });

  it('puts items without a group into the fallback group', () => {
    const raw = [{ id: 'x', title: 'X', action: { route: '/x' } }];
    expect(normalizeResult(raw, 'Fallback')).toEqual([
      {
        id: 'Fallback',
        label: 'Fallback',
        items: [{ id: 'x', title: 'X', group: 'Fallback', action: { route: '/x' } }],
      },
    ]);
  });

  it('passes a grouped response through and forces item.group to the enclosing group id', () => {
    const groups = normalizeResult(
      { groups: [{ id: 'customers', label: 'Customers', total: 42, items: [item('c1', 'other')] }] },
      'fallback',
    );
    expect(groups).toEqual([
      { id: 'customers', label: 'Customers', total: 42, items: [item('c1', 'customers')] },
    ]);
  });

  it('uses the group id as label when the label is missing', () => {
    const groups = normalizeResult({ groups: [{ id: 'orders', items: [item('o1', 'orders')] }] }, 'f');
    expect(groups[0].label).toBe('orders');
  });

  it('drops invalid items and groups', () => {
    const groups = normalizeResult(
      {
        groups: [
          {
            id: 'g',
            label: 'G',
            items: [
              null,
              'text',
              { id: '', title: 'empty id', action: { route: '/' } },
              { id: 'no-title', action: { route: '/' } },
              { id: 'no-action', title: 'No action' },
              { id: 'bad-action', title: 'Bad action', action: { foo: 1 } },
              { id: 'kid', title: 'Has children', action: { route: '/' }, children: [] },
              { id: 'kid-null', title: 'Children null', action: { route: '/' }, children: null },
              { id: 'kid-undef', title: 'Children undefined', action: { route: '/' }, children: undefined },
              { id: 'ok', title: 'Fine', action: { url: 'https://example.com' } },
            ],
          },
          { label: 'no id', items: [] },
          null,
          { id: 'no-items', label: 'No items', items: 'nope' },
        ],
      },
      'f',
    );
    expect(groups.map((g) => [g.id, g.items.map((i) => i.id)])).toEqual([
      ['g', ['ok']],
      ['no-items', []],
    ]);
  });

  it('throws SpotlightResultError for anything that is not a result', () => {
    for (const bad of [null, undefined, 'x', 42, { foo: 1 }, { groups: null }]) {
      expect(() => normalizeResult(bad, 'f')).toThrow(SpotlightResultError);
    }
  });
});

describe('optional field validation', () => {
  const bad: Array<[string, Record<string, unknown>]> = [
    ['subtitle not a string', { subtitle: 1 }],
    ['icon not a string', { icon: ['x'] }],
    ['keywords not an array of strings', { keywords: ['ok', 2] }],
    ['keywords not an array', { keywords: 'acme' }],
    ['badges not an array', { badges: 'VIP' }],
    ['badge without label', { badges: [{ tone: 'info' }] }],
    ['badge with unknown tone', { badges: [{ label: 'a', tone: 'purple' }] }],
    ['suggested not a boolean', { suggested: 'yes' }],
  ];

  it.each(bad)('drops an item with %s in the flat-array path', (_name, extra) => {
    const groups = normalizeResult(
      [item('ok', 'Pages'), item('bad', 'Pages', extra as Partial<SpotlightItem>)],
      'f',
    );
    expect(groups.flatMap((g) => g.items.map((i) => i.id))).toEqual(['ok']);
  });

  it.each(bad)('drops an item with %s in the grouped path', (_name, extra) => {
    const groups = normalizeResult(
      {
        groups: [
          {
            id: 'g',
            label: 'G',
            items: [item('ok', 'g'), item('bad', 'g', extra as Partial<SpotlightItem>)],
          },
        ],
      },
      'f',
    );
    expect(groups[0].items.map((i) => i.id)).toEqual(['ok']);
  });

  it('keeps an item whose optional fields are all well formed', () => {
    const ok = item('ok', 'Pages', {
      subtitle: 's',
      icon: 'pi pi-x',
      keywords: ['a'],
      badges: [{ label: 'VIP', tone: 'success' }, { label: 'plain' }],
      suggested: true,
    });
    expect(normalizeResult([ok], 'f')[0].items).toHaveLength(1);
  });
});

describe('duplicate ids', () => {
  it('keeps the first item per group::id in the flat-array path', () => {
    const groups = normalizeResult(
      [item('1', 'Pages', { title: 'first' }), item('1', 'Pages', { title: 'second' }), item('1', 'Commands')],
      'f',
    );
    expect(groups.map((g) => [g.id, g.items.map((i) => i.title)])).toEqual([
      ['Pages', ['first']],
      ['Commands', ['Title 1']],
    ]);
  });

  it('merges repeated group ids into the first group and drops repeated item ids', () => {
    const groups = normalizeResult(
      {
        groups: [
          { id: 'g', label: 'First', total: 3, items: [item('a', 'g'), item('a', 'g', { title: 'dup' })] },
          { id: 'h', label: 'H', items: [item('a', 'h')] },
          { id: 'g', label: 'Second', total: 9, items: [item('b', 'g'), item('a', 'g', { title: 'dup again' })] },
        ],
      },
      'f',
    );
    expect(groups.map((g) => [g.id, g.label, g.total, g.items.map((i) => `${i.id}:${i.title}`)])).toEqual([
      ['g', 'First', 3, ['a:Title a', 'b:Title b']],
      ['h', 'H', undefined, ['a:Title a']],
    ]);
  });
});

describe('null optional fields', () => {
  const nulls = { subtitle: null, icon: null, keywords: null, badges: null, suggested: null, data: null };

  it('treats null optional fields as absent in both paths', () => {
    const raw = { id: 'x', title: 'X', action: { route: '/x' }, ...nulls };
    const expected = { id: 'x', title: 'X', group: 'g', action: { route: '/x' } };
    expect(normalizeResult([{ ...raw, group: 'g' }], 'f')[0].items).toEqual([expected]);
    expect(normalizeResult({ groups: [{ id: 'g', label: 'G', items: [raw] }] }, 'f')[0].items).toEqual([expected]);
  });

  it('still drops an item whose optional field has the wrong type', () => {
    const raw = { id: 'x', title: 'X', action: { route: '/x' }, subtitle: null, icon: 3 };
    expect(normalizeResult([raw], 'f')).toEqual([]);
  });
});

describe('group total', () => {
  it.each([1.5, -1, Number.NaN, '3'])('ignores a total of %s', (total) => {
    const groups = normalizeResult({ groups: [{ id: 'g', label: 'G', total, items: [] }] }, 'f');
    expect(groups[0]).not.toHaveProperty('total');
  });
});

describe('isSpotlightResponse', () => {
  it('detects the grouped format', () => {
    expect(isSpotlightResponse({ groups: [] })).toBe(true);
    expect(isSpotlightResponse([])).toBe(false);
    expect(isSpotlightResponse({ groups: 'x' })).toBe(false);
  });
});
