import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SpotlightHost, SpotlightTrigger } from '@tocdk-oss/ng-spotlight';
import { NAV_PAGES } from './app.routes';
import { ThemeToggle } from './shared/theme-toggle';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SpotlightHost, SpotlightTrigger, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">&#64;tocdk/ng-spotlight</a>
      <span class="spacer"></span>
      <button type="button" class="search-trigger" spotlightTrigger>
        <i class="pi pi-search" aria-hidden="true"></i>
        <span>Search docs</span>
        <kbd>Ctrl</kbd><kbd>Space</kbd>
      </button>
      <app-theme-toggle />
    </header>
    <div class="layout">
      <nav class="sidenav" aria-label="Pages">
        @for (p of pages; track p.path) {
          <a [routerLink]="'/' + p.path" routerLinkActive="active">{{ p.title }}</a>
        }
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
    <spotlight-host />
  `,
})
export class App {
  protected readonly pages = NAV_PAGES;
}
