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

describe('isSpotlightResponse', () => {
  it('detects the grouped format', () => {
    expect(isSpotlightResponse({ groups: [] })).toBe(true);
    expect(isSpotlightResponse([])).toBe(false);
    expect(isSpotlightResponse({ groups: 'x' })).toBe(false);
  });
});
