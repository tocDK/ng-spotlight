// Public API for @tocdk/ng-spotlight. Every change here must show up in api/ng-spotlight.api.md
// (npm run check:api). Members tagged internal in their JSDoc are stripped from the published .d.ts.

export type {
  SpotlightAction,
  SpotlightBadge,
  SpotlightBadgeTone,
  SpotlightConfig,
  SpotlightContext,
  SpotlightGroup,
  SpotlightHttpOptions,
  SpotlightHttpRequest,
  SpotlightItem,
  SpotlightItemInput,
  SpotlightRecentEntry,
  SpotlightRecentStorage,
  SpotlightResponse,
  SpotlightResult,
  SpotlightSource,
  SpotlightStoredAction,
  SpotlightTexts,
  SpotlightTextValue,
} from './lib/types';
export { localStorageRecent } from './lib/recent';
export { staticSource, type StaticSourceOptions } from './lib/sources/static-source';
export { routeSource, type RouteSourceOptions } from './lib/sources/route-source';
export type { SpotlightRouteData } from './lib/sources/route-walk';
export {
  spotlightRouteAudit,
  type SpotlightRouteAuditEntry,
  type SpotlightRouteAuditOptions,
} from './lib/sources/route-audit';
export { httpSource, type HttpSourceOptions } from './lib/sources/http-source';

export { provideSpotlight } from './lib/provide-spotlight';
export { SpotlightService } from './lib/spotlight.service';
export {
  SPOTLIGHT_RENDERER,
  type SpotlightBadgeContext,
  type SpotlightChipContext,
  type SpotlightGroupHeaderContext,
  type SpotlightInputContext,
  type SpotlightRenderer,
  type SpotlightRowContext,
} from './lib/renderer';
export {
  SpotlightDefaultBadge,
  SpotlightDefaultChip,
  SpotlightDefaultGroupHeader,
  SpotlightDefaultInput,
  SpotlightDefaultRow,
} from './lib/parts/default-parts';
export { SpotlightHost } from './lib/spotlight-host';
export {
  SpotlightEmptyTemplate,
  SpotlightFooterTemplate,
  SpotlightItemTemplate,
  SpotlightTrigger,
  type SpotlightEmptyTemplateContext,
  type SpotlightItemTemplateContext,
} from './lib/templates';
