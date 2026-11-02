import { HttpParams, HttpRequest, type HttpEvent, type HttpResponse } from '@angular/common/http';
import type { SpotlightGroup } from '@tocdk-oss/ng-spotlight';
import { firstValueFrom, type Observable } from 'rxjs';
import { mockBackendInterceptor, resetMockBackend } from './mock-backend';

const never = (() => {
  throw new Error('next must not be called');
}) as never;

function call(url: string, params: Record<string, string>): Observable<HttpEvent<unknown>> {
  return mockBackendInterceptor(new HttpRequest('GET', url, null, { params: new HttpParams({ fromObject: params }) }), never);
}

async function body<T>(url: string, params: Record<string, string>): Promise<T> {
  const event = (await firstValueFrom(call(url, params))) as HttpResponse<T>;
  return event.body as T;
}

describe('mockBackendInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockBackend();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function resolved<T>(url: string, params: Record<string, string>): Promise<T> {
    const pending = body<T>(url, params);
    await vi.advanceTimersByTimeAsync(400);
    return pending;
  }

  it('/api/search filters by chip', async () => {
    const all = await resolved<{ groups: SpotlightGroup[] }>('/api/search', { q: 'o' });
    expect(all.groups.map((g) => g.id)).toEqual(['customers', 'orders']);
    const onlyOrders = await resolved<{ groups: SpotlightGroup[] }>('/api/search', { q: 'o', chip: 'orders' });
    expect(onlyOrders.groups.map((g) => g.id)).toEqual(['orders']);
  });

  it('/api/search caps each group at 5 items and reports the total', async () => {
    const { groups } = await resolved<{ groups: SpotlightGroup[] }>('/api/search', { q: '' });
    const customers = groups.find((g) => g.id === 'customers');
    expect(customers?.items).toHaveLength(5);
    expect(customers?.total).toBe(7);
  });

  it('/api/flaky fails with 503, then succeeds, then fails again', async () => {
    const attempt = async () => {
      const pending = firstValueFrom(call('/api/flaky', { q: 'x' })).then(
        () => 'ok',
        (e: { status: number }) => e.status,
      );
      await vi.advanceTimersByTimeAsync(300);
      return pending;
    };
    expect(await attempt()).toBe(503);
    expect(await attempt()).toBe('ok');
    expect(await attempt()).toBe(503);
  });
});
