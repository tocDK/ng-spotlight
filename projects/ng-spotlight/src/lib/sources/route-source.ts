import { Router, type Route } from '@angular/router';
import type { SpotlightItem, SpotlightSource } from '../types';
import { walkRoutes } from './route-walk';

export interface RouteSourceOptions {
  /** Default 'routes'. */
  id?: string;
  /** Default 'Pages'. */
  group?: string;
  prefix?: string;
  priority?: number;
  /** Return false to hide a route, e.g. to apply the app's role gates. */
  filter?: (route: Route, url: string) => boolean;
}

/**
 * Every labelled static route that is a page, including lazy children once loaded. A labelled
 * parent that renders nothing at its own URL (no component, no empty-path child) is skipped;
 * its labelled children still appear. A deeper route with the same URL (an empty-path child)
 * wins over its parent. Results are local.
 */
export function routeSource(options: RouteSourceOptions = {}): SpotlightSource {
  const group = options.group ?? 'Pages';
  return {
    id: options.id ?? 'routes',
    group,
    prefix: options.prefix,
    priority: options.priority,
    local: true,
    search: (_query, ctx) => {
      const router = ctx.injector.get(Router);
      const byUrl = new Map<string, SpotlightItem>();
      for (const entry of walkRoutes(router.config, true)) {
        if (entry.optedOut || entry.hasParam || entry.label === null || !entry.routable) continue;
        if (options.filter && !options.filter(entry.route, entry.url)) continue;
        byUrl.set(entry.url, {
          id: `route:${entry.url}`,
          title: entry.label,
          subtitle: entry.url,
          group,
          keywords: entry.keywords,
          suggested: entry.suggested,
          action: { route: entry.url },
        });
      }
      return [...byUrl.values()];
    },
  };
}
