import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LinguiService, provideLingui, type LinguiCatalog } from '@tocdk/lingui-angular';
import { localStorageRecent, provideSpotlight, SpotlightFooterTemplate, SpotlightHost, SpotlightTrigger } from '@tocdk/ng-spotlight';
import { demoSources } from '../shared/demo-data';

// Explicit ids keep the catalogs readable; a real app extracts them with `lingui extract`.
const EN: LinguiCatalog = { messages: {} };
const DA: LinguiCatalog = {
  messages: {
    'spotlight.placeholder': 'Søg…',
    'spotlight.all': 'Alle',
    'spotlight.recent': 'Seneste',
    'spotlight.noResults': 'Ingen resultater',
    'spotlight.loading': 'Indlæser…',
    'spotlight.error': 'Noget gik galt',
    'spotlight.retry': 'Prøv igen',
    'spotlight.hintNavigate': 'for at navigere',
    'spotlight.hintOpen': 'for at åbne',
    'spotlight.hintClose': 'for at lukke',
    'spotlight.result': 'resultat',
    'spotlight.results': 'resultater',
  },
};

export const byoLinguiProviders = [
  provideLingui({ sourceLocale: 'en', locales: ['en', 'da'], loader: (locale) => Promise.resolve(locale === 'da' ? DA : EN) }),
  // The factory form runs in an injection context, so the texts can be LinguiService signals.
  provideSpotlight(() => {
    const lingui = inject(LinguiService);
    const t = (key: string, message: string) => lingui.t$({ id: `spotlight.${key}`, message });
    return {
      isolated: true,
      hotkeys: [],
      recent: { storage: localStorageRecent('example-byo-lingui') },
      sources: demoSources(),
      texts: {
        placeholder: t('placeholder', 'Search…'),
        all: t('all', 'All'),
        recent: t('recent', 'Recent'),
        noResults: t('noResults', 'No results'),
        loading: t('loading', 'Loading…'),
        error: t('error', 'Something went wrong'),
        retry: t('retry', 'Retry'),
        hintNavigate: t('hintNavigate', 'to navigate'),
        hintOpen: t('hintOpen', 'to open'),
        hintClose: t('hintClose', 'to close'),
        resultsAnnouncement: (count) => {
          lingui.locale(); // read the locale signal so the announcement follows a switch
          const word = count === 1 ? lingui.t({ id: 'spotlight.result', message: 'result' }) : lingui.t({ id: 'spotlight.results', message: 'results' });
          return `${count} ${word}`;
        },
      },
    };
  }),
];

@Component({
  selector: 'app-byo-lingui-example',
  imports: [SpotlightHost, SpotlightTrigger, SpotlightFooterTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Open the palette and switch the language with the buttons in its footer: every text updates while it stays open.</p>
    <button type="button" class="demo-button" spotlightTrigger>Open the palette</button>
    <spotlight-host>
      <ng-template spotlightFooter>
        <span role="group" aria-label="Language">
          @for (locale of lingui.locales; track locale) {
            <button type="button" class="demo-button" [attr.aria-pressed]="lingui.locale() === locale" (click)="switchTo(locale)">
              {{ locale.toUpperCase() }}
            </button>
          }
        </span>
      </ng-template>
    </spotlight-host>
  `,
})
export class ByoLinguiExample {
  protected readonly lingui = inject(LinguiService);

  protected switchTo(locale: string): void {
    void this.lingui.activate(locale);
  }
}
