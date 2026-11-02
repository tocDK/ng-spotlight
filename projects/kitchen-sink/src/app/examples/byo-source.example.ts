import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  localStorageRecent,
  provideSpotlight,
  SpotlightHost,
  SpotlightTrigger,
  type SpotlightItem,
  type SpotlightSource,
} from '@tocdk-oss/ng-spotlight';

const COLORS = ['crimson', 'coral', 'gold', 'olive', 'teal', 'navy', 'indigo', 'orchid', 'salmon', 'tomato'];
const picked = signal<string | null>(null);

/** A source from scratch: async, cancellable through ctx.signal, results in our own order. */
const colorSource: SpotlightSource = {
  id: 'colors',
  group: 'Colors',
  minLength: 1,
  debounceMs: 100,
  search: (query, { signal: abort }) =>
    new Promise<SpotlightItem[]>((resolve, reject) => {
      const timerId = setTimeout(() => {
        resolve(
          COLORS.filter((c) => c.includes(query.toLowerCase())).map((c) => ({
            id: c,
            title: c,
            group: 'Colors',
            icon: 'pi pi-palette',
            action: { run: () => picked.set(c) },
          })),
        );
      }, 250);
      abort.addEventListener('abort', () => {
        clearTimeout(timerId);
        reject(new DOMException('Superseded by a newer query', 'AbortError'));
      });
    }),
};

export const byoSourceProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { storage: localStorageRecent('example-byo-source') }, sources: [colorSource] }),
];

@Component({
  selector: 'app-byo-source-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Search colours</button>
    <p [style.color]="picked() ?? 'inherit'">Picked: {{ picked() ?? 'none' }}</p>
    <spotlight-host />
  `,
})
export class ByoSourceExample {
  protected readonly picked = picked;
}
