import {
  EnvironmentInjector,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { SpotlightService } from './spotlight.service';
import { SPOTLIGHT_HTTP_DEFAULTS } from './tokens';
import type { SpotlightConfig } from './types';

const SPOTLIGHT_LOCAL_CONFIG = new InjectionToken<SpotlightConfig>('SPOTLIGHT_LOCAL_CONFIG');

/**
 * Sets up a palette. Call it once in the app config; call it again in a child injector (for
 * example a lazy route's `providers`) to add sources there. Pass a factory to build the config
 * in an injection context, e.g. `provideSpotlight(() => ({ texts: { placeholder: inject(I18n).t$('Search…') } }))`.
 */
export function provideSpotlight(config: SpotlightConfig | (() => SpotlightConfig) = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SPOTLIGHT_LOCAL_CONFIG, useFactory: typeof config === 'function' ? config : () => config },
    {
      provide: SpotlightService,
      useFactory: (): SpotlightService => {
        const local = inject(SPOTLIGHT_LOCAL_CONFIG);
        const parent = local.isolated === true ? null : inject(SpotlightService, { skipSelf: true, optional: true });
        return parent ?? new SpotlightService();
      },
    },
    {
      provide: SPOTLIGHT_HTTP_DEFAULTS,
      useFactory: () =>
        inject(SPOTLIGHT_LOCAL_CONFIG).http ?? inject(SPOTLIGHT_HTTP_DEFAULTS, { skipSelf: true, optional: true }) ?? {},
    },
    provideEnvironmentInitializer(() => {
      inject(SpotlightService).configure(inject(SPOTLIGHT_LOCAL_CONFIG), inject(EnvironmentInjector));
    }),
  ]);
}
