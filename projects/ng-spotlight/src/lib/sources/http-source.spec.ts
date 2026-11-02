import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, type Observable } from 'rxjs';
import { SPOTLIGHT_HTTP_DEFAULTS } from '../tokens';
import type { SpotlightContext, SpotlightHttpOptions, SpotlightResult } from '../types';
import { httpSource } from './http-source';

function setup(globalDefaults?: SpotlightHttpOptions) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      ...(globalDefaults ? [{ provide: SPOTLIGHT_HTTP_DEFAULTS, useValue: globalDefaults }] : []),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const ctx = (chip: string | null = null): SpotlightContext => ({
    signal: new AbortController().signal,
    chip,
    injector: TestBed.inject(Injector),
  });
  return { http, ctx };
}

const response = { groups: [{ id: 'customers', label: 'Customers', items: [] }] };

describe('httpSource', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('has remote defaults', () => {
    setup();
    expect(httpSource({ url: '/api/search' })).toMatchObject({ id: 'http:/api/search', minLength: 2, debounceMs: 150, local: false });
    expect(httpSource({ url: '/x', id: 'x', minLength: 3, debounceMs: 0, group: 'X', priority: 2 })).toMatchObject({
      id: 'x',
      minLength: 3,
      debounceMs: 0,
      group: 'X',
      priority: 2,
    });
  });

  it('sends GET {url}?q= and passes the response through', async () => {
    const { http, ctx } = setup();
    const result = firstValueFrom(httpSource({ url: '/api/search' }).search('acme', ctx()) as Observable<SpotlightResult>);
    const req = http.expectOne((r) => r.url === '/api/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('acme');
    expect(req.request.params.has('chip')).toBe(false);
    req.flush(response);
    expect(await result).toEqual(response);
  });

  it('adds chip={groupId} when a chip is active', () => {
    const { http, ctx } = setup();
    void firstValueFrom(httpSource({ url: '/api/search' }).search('acme', ctx('orders')) as Observable<SpotlightResult>);
    const req = http.expectOne((r) => r.url === '/api/search');
    expect(req.request.params.get('chip')).toBe('orders');
    req.flush([]);
  });

  it('errors when the response is not a SpotlightResult', async () => {
    const { http, ctx } = setup();
    const result = firstValueFrom(httpSource({ url: '/api/search' }).search('acme', ctx()) as Observable<SpotlightResult>);
    http.expectOne('/api/search?q=acme').flush({ hits: [] });
    await expect(result).rejects.toThrow('[ng-spotlight] httpSource /api/search: response is neither');
  });

  it('uses the global request/map when the source sets none', async () => {
    const { http, ctx } = setup({
      request: (query) => ({ method: 'POST', body: { term: query }, headers: { 'x-global': '1' } }),
      map: (res) => (res as { data: SpotlightResult }).data,
    });
    const result = firstValueFrom(httpSource({ url: '/api/search' }).search('acme', ctx()) as Observable<SpotlightResult>);
    const req = http.expectOne('/api/search');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ term: 'acme' });
    expect(req.request.headers.get('x-global')).toBe('1');
    req.flush({ data: response });
    expect(await result).toEqual(response);
  });

  it('lets per-source request/map win over the global ones', async () => {
    const { http, ctx } = setup({ request: () => ({ params: { global: 'yes' } }), map: () => [] });
    const source = httpSource({
      url: '/api/legacy',
      request: (query) => ({ params: { term: query } }),
      map: (res, query) => [{ id: query, title: String((res as { name: string }).name), group: 'Legacy', action: { route: '/l' } }],
    });
    const result = firstValueFrom(source.search('abc', ctx()) as Observable<SpotlightResult>);
    const req = http.expectOne((r) => r.url === '/api/legacy');
    expect(req.request.params.get('term')).toBe('abc');
    expect(req.request.params.has('global')).toBe(false);
    req.flush({ name: 'Legacy hit' });
    expect(await result).toEqual([{ id: 'abc', title: 'Legacy hit', group: 'Legacy', action: { route: '/l' } }]);
  });

  it('cancels the request when the subscriber goes away (next keystroke)', () => {
    const { http, ctx } = setup();
    const sub = (httpSource({ url: '/api/search' }).search('acme', ctx()) as Observable<SpotlightResult>).subscribe();
    const req = http.expectOne('/api/search?q=acme');
    sub.unsubscribe();
    expect(req.cancelled).toBe(true);
  });
});
