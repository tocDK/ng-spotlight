import { HttpErrorResponse, HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import type { SpotlightGroup, SpotlightItem, SpotlightResponse } from '@tocdk/ng-spotlight';
import { delay, of, switchMap, throwError, timer } from 'rxjs';

const CUSTOMERS = ['Acme A/S', 'Nordlys ApS', 'Fjord Media', 'Bølge Consulting', 'Havn & Co', 'Skov Retail', 'Acme Nordic'];
const ORDERS = [1001, 1002, 1017, 1042, 1100, 1101, 2001];
const LEGACY = [
  { key: 'L-17', name: 'Legacy campaign 17' },
  { key: 'L-42', name: 'Legacy campaign 42' },
  { key: 'L-99', name: 'Archived campaign 99' },
];

function searchResponse(query: string, chip: string | null): SpotlightResponse {
  const customers: SpotlightItem[] = CUSTOMERS.flatMap((name, i) =>
    name.toLowerCase().includes(query)
      ? [
          {
            id: `customer-${i}`,
            title: name,
            subtitle: 'Customer',
            icon: 'pi pi-building',
            group: 'customers',
            ...(i % 3 === 0 ? { badges: [{ label: 'VIP', tone: 'success' as const }] } : {}),
            action: { url: `https://example.com/customers/${i}`, newTab: true },
          },
        ]
      : [],
  );
  const orders: SpotlightItem[] = ORDERS.flatMap((n) =>
    String(n).includes(query) || `order ${n}`.includes(query)
      ? [
          {
            id: `order-${n}`,
            title: `Order #${n}`,
            icon: 'pi pi-shopping-cart',
            group: 'orders',
            badges: [n > 1500 ? { label: 'open', tone: 'warn' as const } : { label: 'paid', tone: 'info' as const }],
            action: { url: `https://example.com/orders/${n}`, newTab: true },
          },
        ]
      : [],
  );
  const groups: SpotlightGroup[] = [
    { id: 'customers', label: 'Customers', total: customers.length, items: customers.slice(0, 5) },
    { id: 'orders', label: 'Orders', total: orders.length, items: orders.slice(0, 5) },
  ];
  return { groups: groups.filter((g) => (chip === null || g.id === chip) && g.items.length > 0) };
}

let flakyCalls = 0;

/** An in-browser backend for the HTTP examples. Real apps call their own API instead. */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const query = (req.params.get('q') ?? req.params.get('term') ?? '').toLowerCase();
  switch (req.url) {
    case '/api/search':
      return of(new HttpResponse({ status: 200, body: searchResponse(query, req.params.get('chip')) })).pipe(delay(300));
    case '/api/legacy-search':
      return of(new HttpResponse({ status: 200, body: { hits: LEGACY.filter((h) => h.name.toLowerCase().includes(query)) } })).pipe(
        delay(200),
      );
    case '/api/flaky':
      flakyCalls += 1;
      if (flakyCalls % 2 === 1) {
        return timer(200).pipe(
          switchMap(() => throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable', url: req.url }))),
        );
      }
      return of(
        new HttpResponse({
          status: 200,
          body: [{ id: 'flaky-ok', title: `Flaky service answered "${query}"`, group: 'Flaky service', action: { route: '/http-source' } }],
        }),
      ).pipe(delay(200));
    default:
      return next(req);
  }
};
