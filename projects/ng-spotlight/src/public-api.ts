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
export type { SpotlightGroupState } from './lib/engine';

export { provideSpotlight } from './lib/provide-spotlight';
export { SpotlightService, type SpotlightChip, type SpotlightOption } from './lib/spotlight.service';
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
