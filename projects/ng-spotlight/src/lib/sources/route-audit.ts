import type { Route, Routes } from '@angular/router';
import { walkRoutes } from './route-walk';

export interface SpotlightRouteAuditEntry {
  path: string;
  reason: 'missing-label';
}

export interface SpotlightRouteAuditOptions {
  /** Return true to skip a route. */
  ignore?: (route: Route, url: string) => boolean;
}

/**
 * Static pages that have no label (title, data.spotlight.label or data.breadcrumb) and are not
 * opted out with data.spotlight: false. Synchronous: `loadChildren` is not followed, so pass
 * lazy route arrays in directly. A page whose URL a labelled parent already covers passes.
 *
 *     expect(spotlightRouteAudit(adminRoutes)).toEqual([]);
 */
export function spotlightRouteAudit(
  routes: Routes,
  options: SpotlightRouteAuditOptions = {},
): SpotlightRouteAuditEntry[] {
  const walked = walkRoutes(routes, false);
  const labelledUrls = new Set(walked.filter((w) => w.label !== null).map((w) => w.url));
  return walked
    .filter((w) => w.isPage && !w.hasParam && !w.optedOut && w.label === null && !labelledUrls.has(w.url))
    .filter((w) => !(options.ignore?.(w.route, w.url) ?? false))
    .map((w) => ({ path: w.url, reason: 'missing-label' as const }));
}
