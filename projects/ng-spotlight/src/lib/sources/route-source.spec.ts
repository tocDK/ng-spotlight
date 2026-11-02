import { Component, Injector, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { routeSource } from './route-source';
import type { SpotlightItem } from '../types';

@Component({ template: '' })
class Dummy {}

const lazyChildren: Routes = [{ path: 'page', component: Dummy, title: 'Lazy page' }];

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: Dummy, title: 'Dashboard', data: { spotlight: { keywords: ['home'], suggested: true } } },
  { path: 'labelled', component: Dummy, data: { spotlight: { label: 'From data' }, breadcrumb: 'Crumb' } },
  { path: 'crumb', component: Dummy, data: { breadcrumb: 'From breadcrumb' } },
  { path: 'resolved-title', component: Dummy, title: () => 'dynamic', data: { spotlight: { label: 'Resolved fallback' } } },
  { path: 'customers/:id', component: Dummy, title: 'Customer' },
  { path: 'orders/:id', children: [{ path: 'lines', component: Dummy, title: 'Order lines' }] },
  { path: 'hidden', component: Dummy, title: 'Hidden', data: { spotlight: false } },
  { path: 'admin', title: 'Admin', data: { spotlight: false }, children: [{ path: 'users', component: Dummy, title: 'Users' }] },
  {
    path: 'reports',
    title: 'Reports',
    children: [
      { path: '', component: Dummy, title: 'Report overview' },
      { path: 'unlabelled', component: Dummy },
    ],
  },
  { path: 'lazy', loadChildren: () => Promise.resolve(lazyChildren) },
  { matcher: () => null, component: Dummy, title: 'Matcher' },
  { path: '**', component: Dummy, title: 'Not found' },
];

function search(source = routeSource()): SpotlightItem[] {
  return source.search('', { signal: new AbortController().signal, chip: null, injector: TestBed.inject(Injector) }) as SpotlightItem[];
}

describe('routeSource', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter(routes)] });
  });

  it('lists labelled static routes using title, then data.spotlight.label, then data.breadcrumb', () => {
    expect(search().map((i) => [i.subtitle, i.title])).toEqual([
      ['/dashboard', 'Dashboard'],
      ['/labelled', 'From data'],
      ['/crumb', 'From breadcrumb'],
      ['/resolved-title', 'Resolved fallback'],
      ['/admin/users', 'Users'],
      ['/reports', 'Report overview'],
    ]);
  });

  it('builds route items with keywords, suggestion flag and a route action', () => {
    expect(search()[0]).toEqual({
      id: 'route:/dashboard',
      title: 'Dashboard',
      subtitle: '/dashboard',
      group: 'Pages',
      keywords: ['home'],
      suggested: true,
      action: { route: '/dashboard' },
    });
  });

  it('includes lazy children once they are loaded', async () => {
    expect(search().some((i) => i.title === 'Lazy page')).toBe(false);
    await TestBed.inject(Router).navigateByUrl('/lazy/page');
    expect(search().at(-1)).toMatchObject({ title: 'Lazy page', subtitle: '/lazy/page' });
  });

  it('applies the app filter', () => {
    const source = routeSource({ filter: (_route, url) => !url.startsWith('/admin') });
    expect(search(source).some((i) => i.subtitle === '/admin/users')).toBe(false);
  });

  it('is a local source with configurable id and group', () => {
    expect(routeSource()).toMatchObject({ id: 'routes', group: 'Pages', local: true });
    const custom = routeSource({ id: 'nav', group: 'Navigation', prefix: '/', priority: 1 });
    expect(custom).toMatchObject({ id: 'nav', group: 'Navigation', prefix: '/', priority: 1 });
    expect(search(custom)[0].group).toBe('Navigation');
  });
});
