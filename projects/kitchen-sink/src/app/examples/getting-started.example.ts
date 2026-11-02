import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { localStorageRecent, provideSpotlight, routeSource, SpotlightHost, SpotlightTrigger, staticSource } from '@tocdk-oss/ng-spotlight';

const greetings = signal(0);

// In an app this is the whole setup: provideSpotlight() in app.config.ts and <spotlight-host /> in the shell.
// `isolated` and `hotkeys: []` are only here because the kitchen sink runs several palettes side by side
// and the site's own palette already owns Ctrl+Space / ⌘K.
export const gettingStartedProviders = [
  provideSpotlight({
    isolated: true,
    hotkeys: [],
    recent: { storage: localStorageRecent('example-getting-started') },
    sources: [
      routeSource({ group: 'Pages' }),
      staticSource({
        group: 'Commands',
        items: [
          { id: 'hello', title: 'Say hello', icon: 'pi pi-comment', suggested: true, action: { run: () => greetings.update((n) => n + 1) } },
        ],
      }),
    ],
  }),
];

@Component({
  selector: 'app-getting-started-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger><i class="pi pi-search" aria-hidden="true"></i> Open the palette</button>
    <p>"Say hello" has run {{ greetings() }} time(s). Every kitchen-sink page is listed under Pages.</p>
    <spotlight-host />
  `,
})
export class GettingStartedExample {
  protected readonly greetings = greetings;
}
