import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { SPOTLIGHT_RENDERER, type SpotlightRenderer } from '@tocdk/ng-spotlight';
import {
  SpotlightPrimeNgBadge,
  SpotlightPrimeNgChip,
  SpotlightPrimeNgGroupHeader,
  SpotlightPrimeNgInput,
  SpotlightPrimeNgRow,
} from './primeng-parts';

export const SPOTLIGHT_PRIMENG_RENDERER: SpotlightRenderer = {
  dialog: { panelClass: 'sp-primeng', backdropClass: 'sp-primeng-backdrop' },
  input: SpotlightPrimeNgInput,
  chips: SpotlightPrimeNgChip,
  groupHeader: SpotlightPrimeNgGroupHeader,
  row: SpotlightPrimeNgRow,
  badge: SpotlightPrimeNgBadge,
};

/** Renders the palette with PrimeNG components. Use next to provideSpotlight() and providePrimeNG(). */
export function provideSpotlightPrimeNG(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: SPOTLIGHT_RENDERER, useValue: SPOTLIGHT_PRIMENG_RENDERER }]);
}
