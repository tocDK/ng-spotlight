import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  provideSpotlight,
  SpotlightHost,
  SpotlightTrigger,
  type SpotlightRecentEntry,
  type SpotlightRecentStorage,
} from '@tocdk-oss/ng-spotlight';
import { demoSources } from '../shared/demo-data';

/** Recent items in sessionStorage instead of localStorage: forgotten when the tab closes. */
const sessionRecent: SpotlightRecentStorage = {
  load: () => {
    try {
      return Promise.resolve(JSON.parse(sessionStorage.getItem('demo-recent') ?? '[]') as SpotlightRecentEntry[]);
    } catch {
      return Promise.resolve([]);
    }
  },
  save: (items) => {
    try {
      sessionStorage.setItem('demo-recent', JSON.stringify(items));
    } catch {
      // Storage blocked: Recent lasts until the palette instance goes away.
    }
    return Promise.resolve();
  },
};

export const byoRecentProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { max: 3, storage: sessionRecent }, sources: demoSources() }),
];

@Component({
  selector: 'app-byo-recent-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Pick something, then reopen</button>
    <p>Recent keeps the last 3 picks in sessionStorage.</p>
    <spotlight-host />
  `,
})
export class ByoRecentExample {}
