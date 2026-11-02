import type { PageContent } from '../shared/page-content.types';

export const ROUTE_SOURCE_CONTENT: PageContent = {
  title: 'Route source',
  sections: [
    {
      id: 'labels',
      title: 'Labels',
      markdown: `
\`routeSource(options?)\` walks the Router config, including lazy children once they are loaded.
The label comes from the route \`title\` (string), then \`data.spotlight.label\`, then \`data.breadcrumb\`.
Routes with a \`:param\` segment are skipped. Each item's subtitle is its URL.

\`\`\`ts
{ path: 'customers', title: 'Customers', data: { spotlight: { keywords: ['clients'], suggested: true } } }
{ path: 'internal', component: Internal, data: { spotlight: false } }   // opt out
\`\`\`

\`SpotlightRouteData\` types \`data.spotlight\`. \`RouteSourceOptions\`: \`id\`, \`group\` (default "Pages"),
\`prefix\`, \`priority\` and \`filter(route, url)\` for the app's own access rules.
      `,
    },
    {
      id: 'audit',
      title: 'Route audit',
      markdown: `
\`spotlightRouteAudit(routes, options?)\` returns \`SpotlightRouteAuditEntry[]\` (\`{ path, reason }\`) for static pages
without a label that are not opted out. It is synchronous, so a unit test can fail on unlabelled routes:

\`\`\`ts
it('labels every admin route', () => {
  expect(spotlightRouteAudit(adminRoutes)).toEqual([]);
});
\`\`\`

\`SpotlightRouteAuditOptions.ignore(route, url)\` skips routes. \`loadChildren\` is not followed: pass lazy route
arrays to the audit directly. This kitchen sink runs the audit on its own routes in CI.
      `,
    },
  ],
  examples: [{ key: 'route-source', title: 'Kitchen-sink routes and an audit report' }],
};
