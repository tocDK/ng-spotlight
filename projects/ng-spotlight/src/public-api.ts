// Public API for @tocdk/ng-spotlight

export { VERSION } from './lib/version';

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
export { DEFAULT_SPOTLIGHT_TEXTS } from './lib/texts';
export { staticSource, type StaticSourceOptions } from './lib/sources/static-source';
export { routeSource, type RouteSourceOptions } from './lib/sources/route-source';
export type { SpotlightRouteData } from './lib/sources/route-walk';
export {
  spotlightRouteAudit,
  type SpotlightRouteAuditEntry,
  type SpotlightRouteAuditOptions,
} from './lib/sources/route-audit';
export { httpSource, type HttpSourceOptions } from './lib/sources/http-source';
