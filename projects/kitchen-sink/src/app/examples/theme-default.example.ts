import { ChangeDetectionStrategy, Component } from '@angular/core';
import { localStorageRecent, provideSpotlight, SpotlightHost, SpotlightTrigger } from '@tocdk-oss/ng-spotlight';
import { demoSources } from '../shared/demo-data';

// theme: 'default' is the default: one CSS-variable stylesheet with a dark variant (follows .sp-dark here).
export const themeDefaultProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { storage: localStorageRecent('example-theme-default') }, sources: demoSources() }),
];

@Component({
  selector: 'app-theme-default-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Default theme</button>
    <spotlight-host />
  `,
})
export class ThemeDefaultExample {}
