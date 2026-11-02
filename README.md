# ng-spotlight

**A keyboard-first spotlight / command palette for Angular.**
Press <kbd>Ctrl</kbd>+<kbd>Space</kbd> (or <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd>), type, and jump straight to a page, a record or a command.

> **Status: in development.** The first release, `@tocdk/ng-spotlight@21.0.0` for Angular 21, is being built now. The API below follows the approved [design spec](docs/superpowers/specs/2026-11-02-ng-spotlight-design.md) and may still change before the release.

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
import { provideSpotlight, routeSource, staticSource, httpSource } from '@tocdk/ng-spotlight';

provideSpotlight({
  hotkeys: ['ctrl.space', 'mod.k'],
  sources: [
    routeSource({ group: 'Pages' }),
    staticSource({ group: 'Commands', items: [{ id: 'logout', title: 'Log out', action: { run: () => auth.logout() } }] }),
    httpSource({ url: '/api/search', minLength: 2 }),
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

## Packages

| Import | What |
|---|---|
| `@tocdk/ng-spotlight` | Headless core (Angular + CDK only) |
| `@tocdk/ng-spotlight/primeng` | PrimeNG adapter (optional peer dependency) |

Versions follow Angular majors: `21.x` is for Angular 21.

## Kitchen sink

A live demo with every feature, plus a **"Build your own"** guide (custom sources, translations via [`@tocdk/lingui-angular`](https://github.com/tocDK/lingui-angular), your own storage and adapter), will be published at **https://tocdk.github.io/ng-spotlight/** with the first release.

## Docs

- [Design spec](docs/superpowers/specs/2026-11-02-ng-spotlight-design.md)
- [Implementation plan](docs/superpowers/plans/2026-11-02-ng-spotlight.md)

## License

[MIT](LICENSE) © tocDK
