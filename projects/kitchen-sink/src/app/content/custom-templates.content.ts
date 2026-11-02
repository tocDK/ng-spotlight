import type { PageContent } from '../shared/page-content.types';

export const CUSTOM_TEMPLATES_CONTENT: PageContent = {
  title: 'Custom templates',
  sections: [
    {
      id: 'templates',
      title: 'Rows, empty state and footer',
      markdown: `
\`\`\`html
<spotlight-host>
  <ng-template spotlightItem="customers" let-item let-active="active">…</ng-template>  <!-- per-group row -->
  <ng-template spotlightItem let-item>…</ng-template>                                    <!-- fallback row -->
  <ng-template spotlightEmpty let-query>…</ng-template>
  <ng-template spotlightFooter>…</ng-template>
</spotlight-host>
\`\`\`

Precedence: your per-group template, then your fallback template, then the adapter's row, then the core row.
Templates get \`SpotlightItemTemplateContext\` (\`$implicit\` item, \`active\`, \`query\`) or \`SpotlightEmptyTemplateContext\`.
Put anything you need in \`item.data\` and \`item.badges\`. The host keeps \`role="option"\` and the ARIA state, so a
template only supplies markup.
      `,
    },
  ],
  examples: [{ key: 'custom-templates', title: 'Per-group row with badges, empty state and footer' }],
};
