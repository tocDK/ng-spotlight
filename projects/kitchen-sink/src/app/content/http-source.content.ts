import type { PageContent } from '../shared/page-content.types';

export const HTTP_SOURCE_CONTENT: PageContent = {
  title: 'HTTP source',
  sections: [
    {
      id: 'format',
      title: 'Default request and response',
      markdown: `
\`httpSource({ url })\` sends \`GET {url}?q={query}\`, plus \`chip={groupId}\` when a chip other than All is active.
It expects a \`SpotlightResponse\`; a flat \`SpotlightItem[]\` is grouped by \`item.group\`. Results keep the server's order.

\`\`\`json
{ "groups": [{ "id": "customers", "label": "Customers", "total": 12, "items": [
  { "id": "c-1", "title": "Acme A/S", "action": { "url": "/customers/c-1" } }
] }] }
\`\`\`

Backends in any language can validate against \`@tocdk/ng-spotlight/schema/spotlight-response.schema.json\`.
Defaults: \`minLength\` 2, \`debounceMs\` 150, \`timeoutMs\` 5000. A new keystroke cancels the request in flight.
The source uses \`HttpClient\`, so the app's interceptors (auth, tenant) apply; call \`provideHttpClient()\`.
      `,
    },
    {
      id: 'overrides',
      title: 'Default + override',
      markdown: `
1. Nothing set: the defaults above.
2. Global: \`provideSpotlight({ http: { request, map } })\` applies to every \`httpSource\` registered there (\`SpotlightHttpOptions\`).
3. Per source: \`httpSource({ url, request, map })\` wins over the global setting (\`HttpSourceOptions\`).

\`request(query, ctx)\` returns a \`SpotlightHttpRequest\` (\`method\`, \`params\`, \`headers\`, \`body\`);
\`map(response, query)\` returns a \`SpotlightResult\`. A failing or timed-out source shows one error row with Retry in its
own group, calls \`onError\`, and leaves the other groups alone.
      `,
    },
  ],
  examples: [{ key: 'http-source', title: 'Grouped format, global and per-source overrides, a failing service' }],
};
