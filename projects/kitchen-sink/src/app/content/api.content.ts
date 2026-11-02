import type { PageContent } from '../shared/page-content.types';

/** Every public export, so scripts/check-docs.mjs can enforce that the docs keep up. */
export const API_CONTENT: PageContent = {
  title: 'API reference',
  sections: [
    {
      id: 'setup',
      title: 'Setup',
      markdown: `
| Export | What it is |
|---|---|
| \`provideSpotlight(config \\| () => config)\` | Environment providers. \`SpotlightConfig\`: \`hotkeys\`, \`texts\`, \`recent\`, \`http\`, \`theme\`, \`onError\`, \`sources\`, \`isolated\` |
| \`SpotlightService\` | \`open(query?)\`, \`close()\`, \`isOpen\`, \`selected\`, plus the state used by renderers (\`groups\`, \`options\`, \`chips\`, …) |
| \`SpotlightHost\` | \`<spotlight-host>\`, place once in the shell |
| \`SpotlightTrigger\` | \`spotlightTrigger\` directive: opens the palette on click |
| \`SpotlightItemTemplate\`, \`SpotlightItemTemplateContext\` | \`<ng-template spotlightItem="group" let-item>\` row templates |
| \`SpotlightEmptyTemplate\`, \`SpotlightEmptyTemplateContext\` | \`<ng-template spotlightEmpty let-query>\` |
| \`SpotlightFooterTemplate\` | \`<ng-template spotlightFooter>\` |
| \`VERSION\` | The library version |
      `,
    },
    {
      id: 'data',
      title: 'Data types',
      markdown: `
| Export | What it is |
|---|---|
| \`SpotlightItem\`, \`SpotlightItemInput\` | A result; the input form lets \`group\` default to the source's group |
| \`SpotlightAction\`, \`SpotlightStoredAction\` | \`{ route }\`, \`{ url, newTab? }\` or \`{ run }\`; the stored form drops \`run\` |
| \`SpotlightBadge\`, \`SpotlightBadgeTone\` | \`{ label, tone?: 'info' \\| 'success' \\| 'warn' \\| 'danger' }\` |
| \`SpotlightSource\`, \`SpotlightContext\` | A source and the context its \`search(query, ctx)\` receives (\`signal\`, \`chip\`, \`injector\`) |
| \`SpotlightResult\`, \`SpotlightResponse\`, \`SpotlightGroup\` | \`SpotlightItem[]\` or \`{ groups: [{ id, label, total?, items }] }\` |
| \`SpotlightGroupState\`, \`SpotlightOption\`, \`SpotlightChip\` | Rendered state: groups with loading/error, selectable rows, chips |
| \`SpotlightConfig\` | The \`provideSpotlight\` options |
      `,
    },
    {
      id: 'sources',
      title: 'Sources',
      markdown: `
| Export | What it is |
|---|---|
| \`routeSource\`, \`RouteSourceOptions\`, \`SpotlightRouteData\` | Labelled routes |
| \`staticSource\`, \`StaticSourceOptions\` | Fixed commands |
| \`httpSource\`, \`HttpSourceOptions\`, \`SpotlightHttpOptions\`, \`SpotlightHttpRequest\` | Remote results with \`request\`/\`map\` overrides |
| \`spotlightRouteAudit\`, \`SpotlightRouteAuditEntry\`, \`SpotlightRouteAuditOptions\` | Finds unlabelled routes |
| \`schema/spotlight-response.schema.json\` | JSON Schema of the HTTP response format |
      `,
    },
    {
      id: 'texts-recent',
      title: 'Texts and Recent',
      markdown: `
| Export | What it is |
|---|---|
| \`SpotlightTexts\`, \`SpotlightTextValue\`, \`DEFAULT_SPOTLIGHT_TEXTS\` | Every UI string; a value is a string, Signal or Observable |
| \`SpotlightRecentStorage\`, \`SpotlightRecentEntry\`, \`localStorageRecent(key)\` | Where Recent items live |
      `,
    },
    {
      id: 'rendering',
      title: 'Rendering',
      markdown: `
| Export | What it is |
|---|---|
| \`SPOTLIGHT_RENDERER\`, \`SpotlightRenderer\` | Token and shape of a renderer adapter: \`dialog\`, \`input\`, \`chips\`, \`groupHeader\`, \`row\`, \`badge\` |
| \`SpotlightInputContext\`, \`SpotlightChipContext\`, \`SpotlightGroupHeaderContext\`, \`SpotlightRowContext\`, \`SpotlightBadgeContext\` | The \`ctx\` input of each part |
| \`SpotlightDefaultInput\`, \`SpotlightDefaultChip\`, \`SpotlightDefaultGroupHeader\`, \`SpotlightDefaultRow\`, \`SpotlightDefaultBadge\` | The core parts, reusable in your own adapter |
      `,
    },
    {
      id: 'primeng',
      title: '@tocdk/ng-spotlight/primeng',
      markdown: `
| Export | What it is |
|---|---|
| \`provideSpotlightPrimeNG()\`, \`SPOTLIGHT_PRIMENG_RENDERER\` | Renders the palette with PrimeNG components |
| \`SpotlightPrimeNgInput\`, \`SpotlightPrimeNgChip\`, \`SpotlightPrimeNgGroupHeader\`, \`SpotlightPrimeNgRow\`, \`SpotlightPrimeNgBadge\` | The PrimeNG parts |
| \`toneToSeverity\`, \`SpotlightPrimeTagSeverity\` | Badge tone → \`p-tag\` severity |
| \`SPOTLIGHT_PRIMENG_CSS\` | The \`--sp-*\` → PrimeNG token mapping |
      `,
    },
  ],
  examples: [],
};
