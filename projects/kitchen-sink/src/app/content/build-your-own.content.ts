import type { PageContent } from '../shared/page-content.types';

export const BUILD_YOUR_OWN_CONTENT: PageContent = {
  title: 'Build your own',
  sections: [
    {
      id: 'source',
      title: 'A source from scratch',
      markdown: `
Implement \`SpotlightSource\`: \`id\`, optional \`group\`, \`prefix\`, \`minLength\`, \`debounceMs\`, \`timeoutMs\`,
\`priority\`, \`local\` (\`true\` = the library ranks your items) and \`search(query, ctx)\` returning items, a promise or an
Observable. Stop work when \`ctx.signal\` aborts: the next keystroke has replaced the query.
      `,
    },
    {
      id: 'i18n',
      title: 'Texts with @tocdk/lingui-angular',
      markdown: `
Every text (\`SpotlightTexts\`) can be a string, a \`Signal<string>\` or an \`Observable<string>\`, so an open palette
switches language live. The library has no i18n dependency; pass \`provideSpotlight(() => …)\` to build the texts
with \`inject(LinguiService).t$(…)\`. Defaults: \`DEFAULT_SPOTLIGHT_TEXTS\`.
      `,
    },
    {
      id: 'recent',
      title: 'Recent storage',
      markdown: `
\`recent: { max, storage }\` takes any \`SpotlightRecentStorage\` (\`load(): Promise<SpotlightRecentEntry[]>\`,
\`save(items)\`). The default, \`localStorageRecent(key)\`, survives blocked storage. Only what is needed to re-render and
re-run a \`route\` or \`url\` item is stored; \`run()\` items are stored by id and looked up in their source.
      `,
    },
    {
      id: 'renderer',
      title: 'A starter renderer adapter',
      markdown: `
Provide \`SPOTLIGHT_RENDERER\` with any of \`dialog\` (pane/backdrop classes), \`input\`, \`chips\`, \`groupHeader\`, \`row\`
and \`badge\`. Each part is a component with one \`ctx\` input (\`SpotlightRowContext\`, \`SpotlightBadgeContext\`, …). The
host owns behaviour, state and ARIA; an \`input\` part must copy the ARIA fields of \`SpotlightInputContext\` onto its
\`<input>\`. Start from \`SpotlightDefaultRow\` and friends.
      `,
    },
  ],
  examples: [
    { key: 'byo-source', title: 'An async, cancellable custom source' },
    { key: 'byo-lingui', title: 'Texts from @tocdk/lingui-angular with live locale switching' },
    { key: 'byo-recent', title: 'Recent items in sessionStorage' },
    { key: 'byo-renderer', title: 'A starter renderer adapter (row + badge parts)' },
  ],
};
