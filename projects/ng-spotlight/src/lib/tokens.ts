import { InjectionToken } from '@angular/core';
import type { SpotlightHttpOptions } from './types';

/** Global request/map defaults for httpSource. Provided by provideSpotlight({ http }). */
export const SPOTLIGHT_HTTP_DEFAULTS = new InjectionToken<SpotlightHttpOptions>('SPOTLIGHT_HTTP_DEFAULTS');
