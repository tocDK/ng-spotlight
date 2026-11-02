import type { Routes } from '@angular/router';
import { ACCESSIBILITY_CONTENT } from './content/accessibility.content';
import { API_CONTENT } from './content/api.content';
import { BUILD_YOUR_OWN_CONTENT } from './content/build-your-own.content';
import { CUSTOM_TEMPLATES_CONTENT } from './content/custom-templates.content';
import { GETTING_STARTED_CONTENT } from './content/getting-started.content';
import { HOTKEYS_CONTENT } from './content/hotkeys.content';
import { HTTP_SOURCE_CONTENT } from './content/http-source.content';
import { ROUTE_SOURCE_CONTENT } from './content/route-source.content';
import { THEMES_CONTENT } from './content/themes.content';

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
    path: 'http-source',
    title: 'HTTP source',
    loadComponent: page,
    data: { content: HTTP_SOURCE_CONTENT, spotlight: { keywords: ['httpSource', 'api', 'backend', 'schema'] } },
  },
  {
    path: 'custom-templates',
    title: 'Custom templates',
    loadComponent: page,
    data: { content: CUSTOM_TEMPLATES_CONTENT, spotlight: { keywords: ['spotlightItem', 'ng-template', 'badges', 'footer'] } },
  },
  {
    path: 'themes',
    title: 'Themes',
    loadComponent: page,
    data: { content: THEMES_CONTENT, spotlight: { keywords: ['css', 'dark mode', 'primeng', 'variables'], suggested: true } },
  },
  {
    path: 'hotkeys-and-prefixes',
    title: 'Hotkeys & prefixes',
    loadComponent: page,
    data: { content: HOTKEYS_CONTENT, spotlight: { keywords: ['shortcut', 'keyboard', 'prefix'] } },
  },
  {
    path: 'accessibility',
    title: 'Accessibility',
    loadComponent: page,
    data: { content: ACCESSIBILITY_CONTENT, spotlight: { keywords: ['a11y', 'aria', 'screen reader', 'wcag'] } },
  },
  {
    path: 'build-your-own',
    title: 'Build your own',
    loadComponent: page,
    data: { content: BUILD_YOUR_OWN_CONTENT, spotlight: { keywords: ['custom source', 'lingui', 'i18n', 'renderer', 'adapter'] } },
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
