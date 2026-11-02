import { ChangeDetectionStrategy, Component } from '@angular/core';
import { localStorageRecent, provideSpotlight, SpotlightHost, SpotlightTrigger, staticSource } from '@tocdk-oss/ng-spotlight';
import { demoSources } from '../shared/demo-data';

export const hotkeysPrefixesProviders = [
  provideSpotlight({
    isolated: true,
    // A custom shortcut. 'mod' would mean Cmd on macOS and Ctrl elsewhere, e.g. 'mod.shift.p'.
    hotkeys: ['alt.k'],
    recent: { storage: localStorageRecent('example-hotkeys-prefixes') },
    sources: [
      // '#1042' searches only orders; '#' alone lists them all.
      staticSource({
        group: 'Orders',
        prefix: '#',
        items: [1001, 1002, 1017, 1042].map((n) => ({
          id: `order-${n}`,
          title: `Order ${n}`,
          icon: 'pi pi-shopping-cart',
          action: { route: '/hotkeys-and-prefixes' },
        })),
      }),
      // '@an' searches only people.
      staticSource({
        group: 'People',
        prefix: '@',
        items: ['Anna Holm', 'Bo Lund', 'Carla Berg', 'Dennis Krog'].map((name) => ({
          id: `person-${name}`,
          title: name,
          icon: 'pi pi-user',
          action: { route: '/hotkeys-and-prefixes' },
        })),
      }),
      ...demoSources(),
    ],
  }),
];

@Component({
  selector: 'app-hotkeys-prefixes-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Press <kbd>Alt</kbd>+<kbd>K</kbd> on this page, or:</p>
    <button type="button" class="demo-button" spotlightTrigger="#">Open with #</button>
    <button type="button" class="demo-button" spotlightTrigger="@">Open with &#64;</button>
    <spotlight-host />
  `,
})
export class HotkeysPrefixesExample {}
