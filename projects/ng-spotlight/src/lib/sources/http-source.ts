import { HttpClient } from '@angular/common/http';
import { map as mapResponse } from 'rxjs';
import { isSpotlightResponse } from '../normalize';
import { SPOTLIGHT_HTTP_DEFAULTS } from '../tokens';
import type { SpotlightContext, SpotlightHttpOptions, SpotlightHttpRequest, SpotlightResult, SpotlightSource } from '../types';

export interface HttpSourceOptions extends Partial<Omit<SpotlightSource, 'search'>>, SpotlightHttpOptions {
  url: string;
}

function defaultRequest(query: string, ctx: SpotlightContext): SpotlightHttpRequest {
  return { method: 'GET', params: ctx.chip !== null ? { q: query, chip: ctx.chip } : { q: query } };
}

/**
 * Remote results in the server's order. Default request: GET {url}?q={query}[&chip={groupId}].
 * Default response: SpotlightResponse or SpotlightItem[]. Per-source request/map win over
 * provideSpotlight({ http }), which wins over the defaults.
 */
export function httpSource(options: HttpSourceOptions): SpotlightSource {
  const { url, request, map, ...given } = options;
  // An explicit `undefined` (e.g. `minLength: config.minLength`) must not override a default.
  const rest = Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)) as typeof given;
  const defaultMap = (response: unknown): SpotlightResult => {
    if (Array.isArray(response) || isSpotlightResponse(response)) return response as SpotlightResult;
    throw new Error(`[ng-spotlight] httpSource ${url}: response is neither SpotlightResponse nor SpotlightItem[]`);
  };
  return {
    minLength: 2,
    debounceMs: 150,
    local: false,
    ...rest,
    id: rest.id ?? `http:${url}`,
    search: (query, ctx) => {
      const globals = ctx.injector.get(SPOTLIGHT_HTTP_DEFAULTS, {});
      const req = (request ?? globals.request ?? defaultRequest)(query, ctx);
      const toResult = map ?? globals.map ?? defaultMap;
      return ctx.injector
        .get(HttpClient)
        .request(req.method ?? 'GET', url, {
          params: req.params,
          headers: req.headers,
          body: req.body,
          responseType: 'json',
        })
        .pipe(mapResponse((response: unknown) => toResult(response, query)));
    },
  };
}
