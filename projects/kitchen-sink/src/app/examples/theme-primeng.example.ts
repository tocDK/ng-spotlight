import { ChangeDetectionStrategy, Component } from '@angular/core';
import { localStorageRecent, provideSpotlight, SpotlightHost, SpotlightTrigger } from '@tocdk/ng-spotlight';
import { provideSpotlightPrimeNG } from '@tocdk/ng-spotlight/primeng';
import { demoSources } from '../shared/demo-data';

// PrimeNG components (p-iconfield, p-chip, p-tag, pi icons) with colours from the app's PrimeNG preset.
// The app also calls providePrimeNG({ theme: { preset: Aura } }) (see main.ts).
export const themePrimengProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { storage: localStorageRecent('example-theme-primeng') }, sources: demoSources() }),
  provideSpotlightPrimeNG(),
];

@Component({
  selector: 'app-theme-primeng-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>PrimeNG adapter</button>
    <spotlight-host />
  `,
})
export class ThemePrimengExample {}
