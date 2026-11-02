import { Component } from '@angular/core';
import type { Routes } from '@angular/router';
import { spotlightRouteAudit } from './route-audit';

@Component({ template: '' })
class Dummy {}

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', component: Dummy, title: 'Home' },
  { path: 'missing', component: Dummy },
  { path: 'lazy-missing', loadComponent: () => Promise.resolve(Dummy) },
  { path: 'opted-out', component: Dummy, data: { spotlight: false } },
  { path: 'items/:id', component: Dummy },
  {
    path: 'shell',
    component: Dummy,
    children: [
      { path: '', component: Dummy },
      { path: 'inner', component: Dummy },
    ],
  },
  { path: 'settings', title: 'Settings', children: [{ path: '', component: Dummy }] },
  { path: 'ignored', component: Dummy },
  { path: 'lazy', loadChildren: () => Promise.resolve([]) },
  { path: '**', component: Dummy },
];

describe('spotlightRouteAudit', () => {
  it('reports static pages without a label that are not opted out', () => {
    expect(spotlightRouteAudit(routes)).toEqual([
      { path: '/missing', reason: 'missing-label' },
      { path: '/lazy-missing', reason: 'missing-label' },
      { path: '/shell', reason: 'missing-label' },
      { path: '/shell/inner', reason: 'missing-label' },
      { path: '/ignored', reason: 'missing-label' },
    ]);
  });

  it('honours the ignore option', () => {
    expect(spotlightRouteAudit(routes, { ignore: (_route, url) => url === '/ignored' }).map((e) => e.path)).not.toContain('/ignored');
  });

  it('is empty for a fully labelled config, so a CI test can assert toEqual([])', () => {
    expect(spotlightRouteAudit([{ path: 'a', component: Dummy, title: 'A' }])).toEqual([]);
  });
});
