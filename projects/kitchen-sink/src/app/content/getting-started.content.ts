import type { PageContent } from '../shared/page-content.types';

export const GETTING_STARTED_CONTENT: PageContent = {
  title: 'Getting started',
  sections: [
    {
      id: 'install',
      title: 'Install',
      markdown: `
\`\`\`bash
npm i @tocdk/ng-spotlight
\`\`\`

Peer dependencies: \`@angular/core\`, \`@angular/common\`, \`@angular/router\`, \`@angular/cdk\` (21.x) and \`rxjs\`.
Versions follow Angular majors: \`21.x\` supports Angular 21. \`VERSION\` exports the installed version.
      `,
    },
    {
      id: 'setup',
      title: 'Three-line setup',
      markdown: `
\`\`\`ts
// app.config.ts
providers: [provideRouter(routes), provideSpotlight({ sources: [routeSource()] })]
\`\`\`

\`\`\`html
<!-- app shell, once -->
<spotlight-host />
<button spotlightTrigger>Search</button>
\`\`\`

Press **Ctrl+Space** or **⌘K / Ctrl+K**. Every labelled route is searchable. Try it on this site: the
palette in the top bar is configured exactly like this, plus a few links.
      `,
    },
    {
      id: 'service',
      title: 'Open it from code',
      markdown: `
\`SpotlightService\` exposes \`open(query?)\`, \`close()\`, \`isOpen\` (a signal) and \`selected\` (an Observable of the
chosen \`SpotlightItem\`). \`SpotlightTrigger\` (\`spotlightTrigger\`, optionally \`spotlightTrigger="#"\`) opens it on click.

Call \`provideSpotlight()\` again in a lazy route's \`providers\` to add sources there; they disappear when that
injector is destroyed. Use \`provideSpotlight(() => ({ … }))\` when the config needs \`inject()\`.
      `,
    },
  ],
  examples: [{ key: 'getting-started', title: 'A palette with route and static sources' }],
};
