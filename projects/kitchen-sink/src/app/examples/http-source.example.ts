import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { httpSource, localStorageRecent, provideSpotlight, SpotlightHost, SpotlightTrigger } from '@tocdk/ng-spotlight';
import { mockBackendInterceptor } from '../shared/mock-backend';

interface LegacyResponse {
  hits: Array<{ key: string; name: string }>;
}

export const httpSourceProviders = [
  // The interceptor stands in for a server; GET /api/search returns the default SpotlightResponse.
  provideHttpClient(withInterceptors([mockBackendInterceptor])),
  provideSpotlight({
    isolated: true,
    hotkeys: [],
    recent: { storage: localStorageRecent('example-http-source') },
    // Global override: every httpSource registered here sends this request shape.
    http: {
      request: (query, ctx) => {
        const params: Record<string, string> = { q: query };
        if (ctx.chip !== null) params['chip'] = ctx.chip;
        return { params, headers: { 'x-demo-tenant': 'kitchen-sink' } };
      },
    },
    sources: [
      // 1. Defaults: GET /api/search?q=…[&chip=…], grouped response, server order kept.
      httpSource({ id: 'search', url: '/api/search' }),
      // 2. Per-source override: a legacy API with its own request and response shape.
      httpSource({
        id: 'legacy',
        url: '/api/legacy-search',
        group: 'Legacy',
        request: (query) => ({ params: { term: query } }),
        map: (response) =>
          (response as LegacyResponse).hits.map((hit) => ({
            id: hit.key,
            title: hit.name,
            subtitle: 'Legacy system',
            group: 'Legacy',
            action: { url: `https://example.com/legacy/${hit.key}`, newTab: true },
          })),
      }),
      // 3. A failing service: its group shows an error row with Retry; the others are unaffected.
      httpSource({ id: 'flaky', url: '/api/flaky', group: 'Flaky service', minLength: 1 }),
    ],
  }),
];

@Component({
  selector: 'app-http-source-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Search the mock backend</button>
    <p>Try "acme", "10" or "campaign". Tab moves between the chips; the chip is sent as <code>chip=</code>.</p>
    <spotlight-host />
  `,
})
export class HttpSourceExample {}
