import type { Route, Routes } from '@angular/router';

/** The shape of `route.data.spotlight` (or `false` to opt the route out). */
export interface SpotlightRouteData {
  label?: string;
  keywords?: string[];
  suggested?: boolean;
  /** Not used by the library; apps use it in their own nav-coverage tests. */
  hiddenFromNav?: boolean;
}

export interface WalkedRoute {
  route: Route;
  url: string;
  label: string | null;
  keywords: string[];
  suggested: boolean;
  optedOut: boolean;
  /** This route or an ancestor has a `:param` segment. */
  hasParam: boolean;
  /** Renders a component and has no children of its own. */
  isPage: boolean;
  /**
   * Navigating to the URL lands on something: the route renders a component, or one of its
   * children matches the empty path (a page or a redirect). Unloaded lazy children count.
   */
  routable: boolean;
}

/** Angular keeps lazily loaded children here (internal API; pinned by route-source.spec.ts). */
type RouteWithLoadedChildren = Route & { _loadedRoutes?: Routes };

/** Depth-first walk of a Router config. Skips redirects, `**` and custom matchers. */
export function walkRoutes(
  routes: Routes,
  includeLazy: boolean,
  parentSegments: readonly string[] = [],
  parentHasParam = false,
): WalkedRoute[] {
  const out: WalkedRoute[] = [];
  for (const route of routes) {
    if (route.path === '**' || route.redirectTo !== undefined || route.matcher !== undefined) continue;
    const segments = [...parentSegments, ...(route.path ?? '').split('/').filter((s) => s !== '')];
    const hasParam = parentHasParam || segments.some((s) => s.startsWith(':'));
    const data: Record<string, unknown> = route.data ?? {};
    const spotlight = data['spotlight'];
    const routeData: SpotlightRouteData =
      typeof spotlight === 'object' && spotlight !== null ? spotlight : {};
    const breadcrumb = data['breadcrumb'];
    const rawLabel =
      typeof route.title === 'string'
        ? route.title
        : typeof routeData.label === 'string'
          ? routeData.label
          : typeof breadcrumb === 'string'
            ? breadcrumb
            : null;
    const children = route.children ?? (includeLazy ? (route as RouteWithLoadedChildren)._loadedRoutes : undefined);
    const rendersComponent = route.component !== undefined || route.loadComponent !== undefined;
    out.push({
      route,
      url: '/' + segments.join('/'),
      label: rawLabel !== null && rawLabel.trim() !== '' ? rawLabel : null,
      keywords: Array.isArray(routeData.keywords)
        ? routeData.keywords.filter((k): k is string => typeof k === 'string')
        : [],
      suggested: routeData.suggested === true,
      optedOut: spotlight === false,
      hasParam,
      isPage: rendersComponent && route.children === undefined && route.loadChildren === undefined,
      routable:
        rendersComponent ||
        (children ? children.some((child) => (child.path ?? '') === '') : route.loadChildren !== undefined),
    });
    if (children) out.push(...walkRoutes(children, includeLazy, segments, hasParam));
  }
  return out;
}
