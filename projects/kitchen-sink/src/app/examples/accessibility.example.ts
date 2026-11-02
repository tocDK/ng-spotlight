import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { localStorageRecent, provideSpotlight, SpotlightHost, SpotlightService, SpotlightTrigger } from '@tocdk/ng-spotlight';
import { map, scan } from 'rxjs';
import { demoSources } from '../shared/demo-data';

export const accessibilityProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { storage: localStorageRecent('example-accessibility') }, sources: demoSources() }),
];

@Component({
  selector: 'app-accessibility-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Try it with the keyboard only</button>
    <p>Selected so far (from <code>SpotlightService.selected</code>): {{ log() }}</p>
    <spotlight-host />
  `,
})
export class AccessibilityExample {
  protected readonly log = toSignal(
    inject(SpotlightService).selected.pipe(
      scan((titles: string[], item) => [...titles, item.title], []),
      map((titles) => titles.join(', ')),
    ),
    { initialValue: 'nothing yet' },
  );
}
