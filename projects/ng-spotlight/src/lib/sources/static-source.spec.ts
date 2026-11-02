import { Injector } from '@angular/core';
import { staticSource } from './static-source';
import type { SpotlightContext, SpotlightItem } from '../types';

const ctx: SpotlightContext = { signal: new AbortController().signal, chip: null, injector: Injector.NULL };

describe('staticSource', () => {
  it('fills a missing group from the source and keeps an explicit one', () => {
    const source = staticSource({
      group: 'Commands',
      items: [
        { id: 'logout', title: 'Log out', action: { run: () => undefined } },
        { id: 'docs', title: 'Docs', group: 'Links', action: { url: 'https://example.com' } },
      ],
    });
    const items = source.search('', ctx) as SpotlightItem[];
    expect(items.map((i) => [i.id, i.group])).toEqual([
      ['logout', 'Commands'],
      ['docs', 'Links'],
    ]);
  });

  it('is a local source with a stable default id', () => {
    const source = staticSource({ group: 'Commands', items: [], prefix: '>', priority: 3 });
    expect(source).toMatchObject({ id: 'static:Commands', group: 'Commands', local: true, prefix: '>', priority: 3 });
    expect(staticSource({ id: 'cmds', group: 'Commands', items: [] }).id).toBe('cmds');
  });

  it('drops a later item that repeats a group::id', () => {
    const source = staticSource({
      group: 'Commands',
      items: [
        { id: 'a', title: 'First', action: { run: () => undefined } },
        { id: 'a', title: 'Second', action: { run: () => undefined } },
        { id: 'a', title: 'Other group', group: 'Links', action: { url: 'https://example.com' } },
      ],
    });
    const items = source.search('', ctx) as SpotlightItem[];
    expect(items.map((i) => `${i.group}:${i.title}`)).toEqual(['Commands:First', 'Links:Other group']);
  });
});
