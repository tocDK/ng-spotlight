import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  localStorageRecent,
  provideSpotlight,
  SPOTLIGHT_RENDERER,
  SpotlightHost,
  SpotlightTrigger,
  type SpotlightRenderer,
} from '@tocdk-oss/ng-spotlight';
import { demoSources } from '../shared/demo-data';

// Override the CSS variables. Globally: :root { --sp-accent: … }. Here: on one palette's pane class.
export const themeVariablesProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { storage: localStorageRecent('example-theme-variables') }, sources: demoSources() }),
  { provide: SPOTLIGHT_RENDERER, useValue: { dialog: { panelClass: 'demo-purple' } } satisfies SpotlightRenderer },
];

@Component({
  selector: 'app-theme-variables-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-purple { --sp-accent: #8250df; --sp-active-bg: #fbefff; --sp-radius: 4px; --sp-font: Georgia, serif; }
    .sp-dark .demo-purple { --sp-accent: #ab7df8; --sp-active-bg: #3c1e70; }
  `,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>CSS-variable overrides</button>
    <spotlight-host />
  `,
})
export class ThemeVariablesExample {}
