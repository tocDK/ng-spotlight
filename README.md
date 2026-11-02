# ng-spotlight

[![CI](https://github.com/tocDK/ng-spotlight/actions/workflows/ci.yml/badge.svg)](https://github.com/tocDK/ng-spotlight/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@tocdk-oss/ng-spotlight.svg)](https://www.npmjs.com/package/@tocdk-oss/ng-spotlight)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Angular 21](https://img.shields.io/badge/angular-21-dd0031.svg)](https://angular.dev/)

**A keyboard-first spotlight / command palette for Angular.**
Press <kbd>Ctrl</kbd>+<kbd>Space</kbd> (or <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd>), type, and jump straight to a page, a record or a command.

## Why

Apps with many pages and lots of records are slow to navigate by menu. ng-spotlight gives every Angular app a fast "jump anywhere" box, like macOS Spotlight or Home Assistant's quick search:

- **Pages are added automatically** from your Angular routes. A new route is searchable the moment it merges, and a CI helper fails the build on routes without a label.
- **Your own data** comes from any backend through one HTTP endpoint (or a custom source), with results grouped for the UI: customers, orders, users and so on.
- **Default + override everywhere.** The response format, request shape, texts, recent-item storage, row design and theme all work out of the box, and any of them can be replaced globally or per source.
- **Headless core, design on top.** It ships with a CSS-variable default theme, or no CSS at all, and a **PrimeNG adapter** that picks up your PrimeNG theme. More adapters can plug into the same renderer contract.
- **Accessible.** WAI-ARIA combobox pattern, fully keyboard-driven, checked with axe.

## Quick look

```ts
// app.config.ts
import { provideSpotlight, routeSource, staticSource, httpSource } from '@tocdk-oss/ng-spotlight';

provideSpotlight({
  hotkeys: ['ctrl.space', 'mod.k'],
  sources: [
    routeSource({ group: 'Pages' }),
    staticSource({ group: 'Commands', items: [{ id: 'logout', title: 'Log out', action: { run: () => auth.logout() } }] }),
    httpSource({ url: '/api/search' }),
  ],
});
```

```html
<!-- once, in your app shell -->
<spotlight-host />
<button spotlightTrigger>Search</button>
```

The HTTP source expects a simple grouped response by default, and you can map any other format:

```json
{ "groups": [{ "id": "customers", "label": "Customers", "total": 12,
               "items": [{ "id": "263", "title": "Acme ApS", "subtitle": "CVR 12345678", "action": { "route": ["/customers", 263] } }] }] }
```

## Install

```bash
npm i @tocdk-oss/ng-spotlight
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/router`, `@angular/cdk` and `rxjs`. Versions follow
Angular majors: `21.x` supports Angular 21. For the PrimeNG adapter you also need `primeng` 21 (optional peer).

## Three-line setup

```ts
// app.config.ts
import { provideRouter } from '@angular/router';
import { provideSpotlight, routeSource } from '@tocdk-oss/ng-spotlight';

export const appConfig = {
  providers: [provideRouter(routes), provideSpotlight({ sources: [routeSource()] })],
};
```

```html
<!-- app shell, once -->
<spotlight-host />
<button spotlightTrigger>Search</button>
```

Every route with a `title` (or `data.spotlight.label`, or `data.breadcrumb`) is now searchable. Routes with a `:param`
are skipped; `data: { spotlight: false }` opts a route out.

## Sources

```ts
import { localStorageRecent, provideSpotlight, routeSource, staticSource, httpSource } from '@tocdk-oss/ng-spotlight';

provideSpotlight({
  hotkeys: ['ctrl.space', 'mod.k'],                       // default; 'mod' = Cmd on macOS, Ctrl elsewhere
  texts: { placeholder: 'Search…' },                      // string | Signal<string> | Observable<string>
  recent: { max: 8, storage: localStorageRecent('app') }, // default storage: localStorage
  theme: 'default',                                       // or 'none'
  onError: (err, source) => reportToSentry(err, source.id),
  sources: [
    routeSource({ group: 'Pages', filter: (route, url) => canSee(url) }),
    staticSource({ group: 'Commands', items: [{ id: 'logout', title: 'Log out', action: { run: () => auth.logout() } }] }),
    httpSource({ url: '/api/search' }),                   // needs provideHttpClient()
  ],
});
```

- `routeSource()` walks the Router config, including lazy children once loaded. Local results, ranked by the library.
- `staticSource({ group, items })` holds fixed commands. Local results.
- `httpSource({ url })` sends `GET {url}?q={query}` (plus `chip={groupId}` when a chip is active) and expects
  `{ groups: [{ id, label, total?, items }] }` or a flat item array. Results keep the server's order. Override the
  request and response globally (`provideSpotlight({ http: { request, map } })`) or per source
  (`httpSource({ url, request, map })`). The JSON Schema ships as `@tocdk-oss/ng-spotlight/schema/spotlight-response.schema.json`.
- Any object implementing `SpotlightSource` is a source: `search(query, ctx)` may return items, a promise or an
  Observable, and should stop when `ctx.signal` aborts.

Each item has an `action`: `{ route }` (Router), `{ url, newTab? }` (only http, https, mailto, tel and path-relative
URLs are allowed; protocol-relative `//host` URLs are blocked) or `{ run }`. The palette waits up to 5 seconds for a
`run()` promise, then closes anyway; `selected` fires when it settles. A query that starts with a source's `prefix` (for example `#` or `@`) searches only that source.
Call `provideSpotlight()` again in a lazy route's `providers` to add sources for that area. Such a child call only
adds `sources` (and `http` defaults for them); its `texts`, `hotkeys`, `recent`, `theme` and `onError` are ignored
(with a dev-mode warning) because the first call owns them. Pass `isolated: true` for a separate palette instead.
With several palettes on a page, one hotkey press reaches exactly one of them: the open one (so the hotkey closes it),
else the one opened most recently, else the `<spotlight-host>` created first. Place one `<spotlight-host>` per palette.

## CI check for unlabelled routes

```ts
import { spotlightRouteAudit } from '@tocdk-oss/ng-spotlight';

it('labels every admin route', () => {
  expect(spotlightRouteAudit(adminRoutes)).toEqual([]);
});
```

## Templates

```html
<spotlight-host>
  <ng-template spotlightItem="customers" let-item>…</ng-template>  <!-- per-group row -->
  <ng-template spotlightItem let-item>…</ng-template>              <!-- fallback row -->
  <ng-template spotlightEmpty let-query>…</ng-template>
  <ng-template spotlightFooter>…</ng-template>
</spotlight-host>
```

## Theming and PrimeNG

The default theme uses CSS variables only (`--sp-bg`, `--sp-fg`, `--sp-muted`, `--sp-accent`, `--sp-radius`,
`--sp-font`, `--sp-shadow`, …) and follows `prefers-color-scheme` (force a mode with the `sp-dark` / `sp-light` class).
`theme: 'none'` ships no CSS.

```ts
import { provideSpotlightPrimeNG } from '@tocdk-oss/ng-spotlight/primeng';

providers: [providePrimeNG({ theme: { preset: Aura } }), provideSpotlight({ /* … */ }), provideSpotlightPrimeNG()];
```

The adapter renders with `p-iconfield` + `pInputText`, `p-chip`, `p-tag` and `pi` icons and takes its colours from your
PrimeNG preset. Apps that never import `/primeng` never load PrimeNG. Other design systems: provide `SPOTLIGHT_RENDERER`
with your own part components (see "Build your own" in the docs).

## Accessibility

WAI-ARIA combobox inside a modal dialog: `role="combobox"` input with `aria-activedescendant`, a `role="listbox"` of
labelled `role="group"`s and `role="option"`s, a focus trap with focus restore, and a polite live region for the result
count. Keys: ↑/↓ move, Enter opens, Ctrl/⌘+Enter opens links in a new tab, Tab/Shift+Tab switch chips, Esc closes.
The tests run axe on the open palette with zero violations. Note: macOS may use Ctrl+Space to switch input source,
which is why ⌘K is in the default set.

## API

The whole public API, with every member, is snapshotted in [`api/ng-spotlight.api.md`](api/ng-spotlight.api.md) and
[`api/ng-spotlight-primeng.api.md`](api/ng-spotlight-primeng.api.md); CI fails when the built `.d.ts` drifts from them.

| Export | What it is |
|---|---|
| `provideSpotlight(config \| () => config)` | Sets up a palette (`SpotlightConfig`: `hotkeys`, `texts`, `recent`, `http`, `theme`, `onError`, `sources`, `isolated`) |
| `SpotlightService` | `open(query?)`, `close()`, `isOpen` (signal), `selected` (Observable of the chosen item). Nothing else is public |
| `<spotlight-host>`, `spotlightTrigger` | The palette, and a directive that opens it on click (`spotlightTrigger="#"` sets a query) |
| `spotlightItem`, `spotlightEmpty`, `spotlightFooter` | Templates, with `SpotlightItemTemplateContext` and `SpotlightEmptyTemplateContext` |
| `routeSource`, `staticSource`, `httpSource`, `spotlightRouteAudit` | Built-in sources and the route audit, with their `*Options` types |
| `SpotlightItem`, `SpotlightItemInput`, `SpotlightAction`, `SpotlightBadge`, `SpotlightSource`, `SpotlightContext`, `SpotlightResult`, `SpotlightResponse`, `SpotlightGroup`, `SpotlightHttpOptions`, `SpotlightHttpRequest`, `SpotlightRouteData` | Data types |
| `SpotlightTexts`, `SpotlightTextValue` | UI strings (keys left out keep their English defaults) |
| `localStorageRecent`, `SpotlightRecentStorage`, `SpotlightRecentEntry`, `SpotlightStoredAction` | Recent items and their storage |
| `SPOTLIGHT_RENDERER`, `SpotlightRenderer`, the part context types, `SpotlightDefault*` parts | Renderer contract for adapters |
| `/primeng`: `provideSpotlightPrimeNG()`, `SPOTLIGHT_PRIMENG_RENDERER`, `SpotlightPrimeNg*` parts | PrimeNG adapter |

## Packages

| Import | What |
|---|---|
| `@tocdk-oss/ng-spotlight` | Headless core (Angular + CDK only) |
| `@tocdk-oss/ng-spotlight/primeng` | PrimeNG adapter (optional peer dependency) |

Versions follow Angular majors: `21.x` is for Angular 21.

## Kitchen sink

A live demo with every feature, plus a **"Build your own"** guide (custom sources, translations via [`@tocdk/lingui-angular`](https://github.com/tocDK/lingui-angular), your own storage and adapter), is published at **https://tocdk.github.io/ng-spotlight/** by the Pages workflow. Every page shows its own source.

## Docs

- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Design spec](docs/superpowers/specs/2026-11-02-ng-spotlight-design.md)
- [Implementation plan](docs/superpowers/plans/2026-11-02-ng-spotlight.md)

## License

[MIT](LICENSE) © tocDK
