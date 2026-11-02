import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { localStorageRecent, provideSpotlight, routeSource, staticSource } from '@tocdk-oss/ng-spotlight';
import { providePrimeNG } from 'primeng/config';
import { App } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.sp-dark' } } }),
    // The site's own palette (Ctrl+Space / ⌘K): every documented page, plus links.
    provideSpotlight({
      recent: { storage: localStorageRecent('kitchen-sink') },
      sources: [
        routeSource({ group: 'Pages' }),
        staticSource({
          group: 'Links',
          items: [
            {
              id: 'github',
              title: 'GitHub repository',
              icon: 'pi pi-github',
              keywords: ['source', 'code'],
              action: { url: 'https://github.com/tocDK/ng-spotlight', newTab: true },
            },
            {
              id: 'npm',
              title: 'npm package',
              icon: 'pi pi-box',
              keywords: ['install'],
              action: { url: 'https://www.npmjs.com/package/@tocdk-oss/ng-spotlight', newTab: true },
            },
          ],
        }),
      ],
    }),
  ],
}).catch((err: unknown) => console.error(err));
