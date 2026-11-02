import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import type { SpotlightItem, SpotlightResponse } from '../src/lib/types';

const schema: object = JSON.parse(
  readFileSync(resolve(process.cwd(), 'projects/ng-spotlight/schema/spotlight-response.schema.json'), 'utf8'),
) as object;
const validate = new Ajv2020({ allErrors: true }).compile(schema);

// Typed fixtures: if the TS types and the schema drift apart, one of these stops compiling or validating.
const grouped: SpotlightResponse = {
  groups: [
    {
      id: 'customers',
      label: 'Customers',
      total: 12,
      items: [
        {
          id: 'c-1',
          title: 'Acme A/S',
          subtitle: 'CVR 12345678',
          icon: 'pi pi-building',
          group: 'customers',
          keywords: ['acme'],
          badges: [{ label: 'VIP', tone: 'success' }],
          suggested: false,
          data: { anything: true },
          action: { route: ['/customers', 'c-1'] },
        },
      ],
    },
    {
      id: 'orders',
      label: 'Orders',
      items: [
        { id: 'o-1', title: 'Order 1', group: 'orders', action: { url: 'https://x.test/o/1', newTab: true } },
      ],
    },
  ],
};
const flat: SpotlightItem[] = [{ id: 'p', title: 'Page', group: 'Pages', action: { route: '/page' } }];

describe('spotlight-response.schema.json', () => {
  it('accepts the grouped SpotlightResponse format', () => {
    expect(validate(grouped)).toBe(true);
  });

  it('accepts a flat SpotlightItem array', () => {
    expect(validate(flat)).toBe(true);
  });

  it('rejects an item without an action', () => {
    expect(validate({ groups: [{ id: 'g', label: 'G', items: [{ id: 'x', title: 'X' }] }] })).toBe(false);
  });

  it('rejects an item that sets the reserved children field', () => {
    expect(validate([{ id: 'x', title: 'X', action: { route: '/x' }, children: [] }])).toBe(false);
  });

  it('rejects an unknown badge tone and a run() action (functions are not JSON)', () => {
    expect(
      validate([{ id: 'x', title: 'X', action: { route: '/x' }, badges: [{ label: 'a', tone: 'purple' }] }]),
    ).toBe(false);
    expect(validate([{ id: 'x', title: 'X', action: { run: 'alert(1)' } }])).toBe(false);
  });

  it('rejects a group without an id', () => {
    expect(validate({ groups: [{ label: 'G', items: [] }] })).toBe(false);
  });
});
