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

// theme: 'none' ships no CSS. A partial renderer adds a class to the pane so the app can style it.
export const themeNoneProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], theme: 'none', recent: { storage: localStorageRecent('example-theme-none') }, sources: demoSources() }),
  { provide: SPOTLIGHT_RENDERER, useValue: { dialog: { panelClass: 'demo-bare', backdropClass: 'demo-bare-backdrop' } } satisfies SpotlightRenderer },
];

@Component({
  selector: 'app-theme-none-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-bare-backdrop { background: rgba(0, 0, 0, 0.5); }
    .demo-bare .sp-dialog { display: flex; flex-direction: column; max-height: 70vh; background: #fffbe6; color: #222; border: 2px solid #222; font-family: Georgia, serif; }
    .demo-bare .sp-input-el { width: 100%; padding: 12px; border: 0; border-bottom: 2px solid #222; background: transparent; color: inherit; font: inherit; }
    .demo-bare .sp-list { overflow: auto; }
    .demo-bare .sp-group-header { padding: 6px 12px; font-weight: bold; }
    .demo-bare .sp-option { display: flex; gap: 8px; padding: 6px 12px; cursor: pointer; }
    .demo-bare .sp-option[aria-selected='true'] { background: #222; color: #fffbe6; }
    .demo-bare .sp-chips, .demo-bare .sp-footer { display: flex; gap: 8px; padding: 6px 12px; font-size: 12px; }
  `,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>theme: 'none' + your own CSS</button>
    <spotlight-host />
  `,
})
export class ThemeNoneExample {}
