import type { Routes } from '@angular/router';
import { API_CONTENT } from './content/api.content';
import { GETTING_STARTED_CONTENT } from './content/getting-started.content';
import { ROUTE_SOURCE_CONTENT } from './content/route-source.content';

const page = () => import('./shared/page').then((m) => m.Page);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'getting-started' },
  {
    path: 'getting-started',
    title: 'Getting started',
    loadComponent: page,
    data: { content: GETTING_STARTED_CONTENT, spotlight: { keywords: ['install', 'setup', 'provideSpotlight'], suggested: true } },
  },
  {
    path: 'route-source',
    title: 'Route source',
    loadComponent: page,
    data: { content: ROUTE_SOURCE_CONTENT, spotlight: { keywords: ['routeSource', 'spotlightRouteAudit', 'audit'] } },
  },
  {
    path: 'api',
    title: 'API reference',
    loadComponent: page,
    data: { content: API_CONTENT, spotlight: { keywords: ['exports', 'reference', 'types'] } },
  },
  { path: '**', redirectTo: 'getting-started' },
];

export interface NavPage {
  path: string;
  title: string;
}

export const NAV_PAGES: NavPage[] = routes.flatMap((r) =>
  typeof r.path === 'string' && typeof r.title === 'string' ? [{ path: r.path, title: r.title }] : [],
);
