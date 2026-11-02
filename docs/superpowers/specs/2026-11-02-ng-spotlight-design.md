# ng-spotlight: design

**Status:** draft for review · **Date:** 2026-11-02 · **Owner:** Thomas Christensen (tocDK)
**Package:** `@tocdk/ng-spotlight` (MIT) · **Repo:** https://github.com/tocDK/ng-spotlight
**Sibling:** `@tocdk/lingui-angular`. Same repo layout, tooling, release model and kitchen-sink style.

## 1. Purpose

A keyboard-first "spotlight" (command palette) for Angular apps. You press a hotkey (default `Ctrl+Space`) or click a trigger, type, and jump straight to a page, a record or a command. It is inspired by Home Assistant's quick search and macOS Spotlight.

First consumer: the Tivedo admin (FR-087, tivedo-app/tivedo-claude#412). It has 126 admin pages plus customers, agencies, campaigns, orders and users. The library itself is generic and open source.

### Success criteria

1. **Three-line setup.** `provideSpotlight({...})` plus `<spotlight-host />` gives a working palette with route search.
2. **New routes appear automatically.** A labelled route becomes searchable with no extra work, and an audit helper lets a CI test fail on unlabelled routes.
3. **Default plus override at every level.** Data format, request shape, texts, recent-item storage, row design and theme all work out of the box, and any of them can be replaced globally or per source.
4. **Design-system native.** The PrimeNG adapter renders with PrimeNG components, so it inherits the app's theme, including white-label themes.
5. **Accessible.** It follows the WAI-ARIA combobox pattern, works fully from the keyboard, and passes axe with zero violations.
6. **Fast.** Local results show in the same frame as the keystroke. Stale HTTP responses never render.

### Non-goals (v1)

- Nested pages ("Customers ›" drill-in), contextual per-page commands and multi-step actions. These come later as a minor release; v1 reserves the `children` field so they need no API break.
- Typo-tolerant fuzzy search (Levenshtein) for local sources. Ranking is subsequence-based.
- Server-side search engines. The library only defines a response format.
- A composable primitives API in the style of React's cmdk. The building blocks stay internal for now and can be exported later without a break.
- An Angular Material adapter. The renderer token makes one roughly half a day of work when someone needs it.

## 2. Packaging

| Entry point | Contents | Dependencies |
|---|---|---|
| `@tocdk/ng-spotlight` | Headless core: overlay host, hotkeys, keyboard navigation, ARIA, sources, ranking, recent items, default CSS-variable theme, route audit helper | `@angular/core`, `@angular/common`, `@angular/router`, `@angular/cdk` (peer) |
| `@tocdk/ng-spotlight/primeng` | PrimeNG renderer adapter | `primeng` (optional peer) |

- **One repo, one npm package, built with ng-packagr secondary entry points.** Apps that don't use PrimeNG never resolve it.
- **Versions follow Angular majors**, like lingui-angular: `21.x` supports Angular 21, `22.x` supports Angular 22.
- **Size target:** core at or under 15 kB gzipped.

## 3. Public API

### 3.1 Setup

```ts
provideSpotlight({
  hotkeys: ['ctrl.space', 'mod.k'],          // default; 'mod' = Cmd on macOS, Ctrl elsewhere
  texts: { placeholder: 'Search…' },         // string | Signal<string> | Observable<string> per key
  recent: { max: 8, storage: localStorageRecent('app') },  // default storage = localStorage
  http: { request, map },                    // global defaults for every httpSource (optional)
  theme: 'default',                          // 'default' | 'none'
  onError: (err, source) => {},              // optional, e.g. send to Sentry
  sources: [
    routeSource({ group: 'Pages' }),
    staticSource({ group: 'Commands', items: [/* ... */] }),
    httpSource({ url: '/api/admin/search', minLength: 2, debounceMs: 150 }),
  ],
})
```

```html
<spotlight-host />                          <!-- once, in the app shell -->
<button spotlightTrigger>Search</button>    <!-- any element can open it -->
```

- `SpotlightService` exposes `open(query?)`, `close()`, `isOpen: Signal<boolean>` and `selected: Observable<SpotlightItem>`.
- `provideSpotlight` can be called again in a child injector, for example a lazy admin area, to add sources there.

### 3.2 Types

```ts
interface SpotlightItem {
  id: string
  title: string
  subtitle?: string
  icon?: string                     // the renderer decides the meaning (class name, URL, …)
  group: string
  keywords?: string[]
  badges?: { label: string; tone?: 'info' | 'success' | 'warn' | 'danger' }[]
  suggested?: boolean               // shown on empty query
  data?: unknown                    // free payload for custom templates
  action: { route: unknown[] | string } | { url: string; newTab?: boolean } | { run: () => void | Promise<void> }
  children?: never                  // reserved for nested pages (v1.x); must be absent in v1
}

interface SpotlightSource {
  id: string
  group?: string                    // default group for items that do not set one
  prefix?: string                   // e.g. '#', '@'; when the query starts with it, only this source runs
  minLength?: number                // default 0 for local sources, 2 for http
  debounceMs?: number               // default 0 for local sources, 150 for http
  timeoutMs?: number                // default 5000
  priority?: number                 // group order; lower comes first; default = registration order
  local?: boolean                   // true: library ranks the results; false: keep source order
  search(query: string, ctx: SpotlightContext): Observable<SpotlightResult> | Promise<SpotlightResult> | SpotlightResult
}

type SpotlightResult = SpotlightItem[] | SpotlightResponse

interface SpotlightResponse { groups: SpotlightGroup[] }
interface SpotlightGroup { id: string; label: string; total?: number; items: SpotlightItem[] }
```

`SpotlightContext` carries `signal: AbortSignal` (aborted on the next keystroke), the active chip and the injector.

### 3.3 Built-in sources

- **`routeSource(opts?)`** walks the Router config, including lazy children once loaded.
  - Label precedence: route `title` (string), then `data.spotlight.label`, then `data.breadcrumb`.
  - Routes with a `:param` segment are skipped.
  - A route opts out with `data: { spotlight: false }` and adds search words with `data.spotlight.keywords`.
  - `opts.filter(route, url)` lets the app apply its own access rules. Tivedo reuses the admin-nav role gates.
  - Results are local, so the library ranks them.
- **`staticSource({ group, items })`** holds fixed commands. Results are local.
- **`httpSource({ url, request?, map?, ...SpotlightSource })`** handles remote results, which keep the server's order. Section 4 covers the format and overrides.
- **Custom sources** implement `SpotlightSource` directly.

### 3.4 Route audit

`spotlightRouteAudit(routes, opts?)` returns `{ path, reason }[]` for static routes that have no label and are not opted out. It runs synchronously over the route config, so a unit test can assert it is empty:

```ts
expect(spotlightRouteAudit(adminRoutes)).toEqual([])
```

### 3.5 Templates

```html
<spotlight-host>
  <ng-template spotlightItem="customers" let-item>…</ng-template>  <!-- per-group row -->
  <ng-template spotlightItem let-item>…</ng-template>              <!-- fallback row for all groups -->
  <ng-template spotlightEmpty let-query>…</ng-template>
  <ng-template spotlightFooter>…</ng-template>
</spotlight-host>
```

Precedence: app per-group template, then app fallback template, then the adapter's row, then the core's row.

## 4. HTTP format and overrides ("default + override")

**Default request:** `GET {url}?q={query}`, plus `chip={groupId}` when a chip other than All is active, and the `AbortSignal` for cancellation.

**Default response:** `SpotlightResponse`, i.e. `{ groups: [{ id, label, total?, items: [...] }] }`. A flat `SpotlightItem[]` is also accepted and grouped by `item.group`.

**Overrides, all optional:**

1. **Nothing set:** the defaults above.
2. **Global:** `provideSpotlight({ http: { request, map } })` applies to every `httpSource`.
3. **Per source:** `httpSource({ url, request, map })` wins over the global setting.

- `request(query, ctx) => { method?, params?, headers?, body? }`
- `map(response, query) => SpotlightResult`

The library ships the response format as a TypeScript type plus a JSON Schema (`schema/spotlight-response.schema.json`), so backends in any language can validate against it.

## 5. Data flow

1. **Normalise:** trim the query. If it starts with a registered `prefix`, only that source runs, and the prefix is removed from the query it receives.
2. **Fan out:** every eligible source runs independently, with its own `minLength`, `debounceMs` and `timeoutMs`. A new keystroke aborts the source's in-flight request (`switchMap` plus `AbortSignal`), so a stale response can never render.
3. **Stream:** groups render as their source answers. Group order is fixed by `priority`, so later answers don't make the list jump. A group still loading shows a small spinner in its header.
4. **Rank local sources:** exact match, then a match at the start of the title, then a match at the start of a word, then subsequence order. Keywords count at a lower weight, and items in Recent get a small boost. HTTP results keep the server's order.
5. **Pre-select:** the first item of the first group is active, so typing then pressing Enter jumps straight there.
6. **Empty query:** shows Recent (most recent first, `recent.max`), then any `suggested` items.
7. **Chips:** one chip per active group, plus All. Tab and Shift+Tab move between chips. When a chip is active, only the sources feeding that group run.
8. **Errors:** a failing or timed-out source shows one muted row in its group (with Retry) and calls `onError`. The other groups are unaffected.
9. **Select:** run the action (`route` goes through Router; `url` opens a new tab on Ctrl or Cmd+Enter, or when `newTab` is set; `run()` is awaited), push the item to Recent, close the overlay, and emit `selected`.

**Recent storage:** `SpotlightRecentStorage { load(): Promise<SpotlightItem[]>; save(items): Promise<void> }`. The default is `localStorageRecent(key)`, which wraps access in try/catch so the palette still works when storage is blocked. Only the item fields needed to re-render and re-run a `route` or `url` action are stored. `run()` items are stored by id and resolved through their source.

## 6. Texts and i18n

`texts` keys: `placeholder`, `all`, `recent`, `noResults`, `loading`, `error`, `retry`, `resultsAnnouncement` (a function of count), `hintNavigate`, `hintOpen`, `hintClose`.

Each value can be a string, a `Signal<string>` or an `Observable<string>`, so switching language updates an open palette live. The library has no i18n dependency. The kitchen sink's "Build your own" page wires the texts to `@tocdk/lingui-angular`.

## 7. Rendering

### 7.1 Core

- **CDK Overlay:** centred near the top of the viewport, with a backdrop. Esc or a backdrop click closes it. Focus is trapped while open and restored to the previous element on close.
- **Phone width (at most 600 px):** a full-screen sheet.
- **ARIA:** the input is `role="combobox"` with `aria-expanded`, `aria-controls` and `aria-activedescendant`. The list is `role="listbox"`, groups are `role="group"` with `aria-labelledby`, and items are `role="option"`. A polite live region announces `resultsAnnouncement(n)`.
- **Hotkeys** are registered on `document` and ignore IME composition. `ctrl.space` is documented with its macOS caveat: the OS may use it to switch input source, so `mod.k` is in the default set.
- **Default theme:** one stylesheet using CSS variables only (`--sp-bg`, `--sp-fg`, `--sp-muted`, `--sp-accent`, `--sp-radius`, `--sp-font`, `--sp-shadow`, …), with a dark-mode variant. `theme: 'none'` ships no CSS.

### 7.2 Renderer contract

The internal `SPOTLIGHT_RENDERER` token provides templates for these parts: `dialog`, `input`, `chips`, `groupHeader`, `row` and `badge`. The core owns behaviour, state, ARIA attributes and keyboard handling, and passes them into the renderer templates as context. An adapter only replaces markup.

### 7.3 PrimeNG adapter

`provideSpotlightPrimeNG()` maps the parts to PrimeNG components: `p-dialog`, `p-iconfield` with `pInputText`, `p-chip`, `p-tag` for badges, and `pi` icon classes for `icon`. It must produce the same accessibility tree as the core, and a test enforces this.

## 8. Repository and tooling (mirrors lingui-angular)

```
projects/
  ng-spotlight/          # library: src/lib (core), primeng/ (secondary entry), schema/
  kitchen-sink/          # demo app → GitHub Pages
scripts/                 # generate-example-sources.mjs, check-docs.mjs
docs/superpowers/specs/  # this file
.github/workflows/       # ci.yml, release.yml, deploy-pages.yml
```

- **Tests:** vitest (`test:lib`, `test:demo`, coverage), plus axe checks on the open overlay in both themes. Core coverage must be at least 90%.
- **CI (`ci.yml`):** lint, tests, build lib and demo, docs check.
- **Release (`release.yml`):** npm publish with provenance on a version tag.
- **Pages (`deploy-pages.yml`):** the kitchen sink.
- **Workflow hygiene from day 1:** every action pinned to a commit SHA, `persist-credentials: false`, least-privilege `permissions:` per job, and no untrusted `${{ }}` expansion in `run:`. These address the zizmor findings Rex raised on lingui-angular.
- **Team harness (tocDK/team):** Rex CVE ledger (scan-only) plus Rex security scans, self-hosted CI runner, board licenses panel, and Ada PR review where siblings have it.

## 9. Kitchen sink

Published at `https://tocdk.github.io/ng-spotlight/`. Every page shows its own source, generated from the real example files the way lingui-angular does it.

| Page | Shows |
|---|---|
| Getting started | `provideSpotlight` + `<spotlight-host>`, Ctrl+Space |
| Route source | Auto pages, label precedence, opt-out, the route audit |
| HTTP source | The grouped format against an in-browser mock backend (HttpClient interceptor), with the global and per-source overrides |
| Custom templates | Per-group rows, badges, empty state and footer |
| Themes | Default, `none` and PrimeNG side by side, plus CSS-variable overrides |
| Hotkeys & prefixes | Custom shortcuts, `#` and `@` prefixes |
| Accessibility | Keyboard-only walkthrough and screen-reader notes |
| **Build your own** | A custom source from scratch; texts wired to `@tocdk/lingui-angular` with live locale switching; a custom recent-items storage; a starter renderer adapter |

## 10. Tivedo integration (FR-087, separate repo)

- `provideSpotlight` + `provideSpotlightPrimeNG()` in the admin shell, with a 🔍 `spotlightTrigger` in the top bar.
- **Sources:**
  - `routeSource` over `adminRoutes`, filtered by the admin-nav role and feature gates.
  - A `staticSource` for commands (log out, switch language).
  - `httpSource('/api/admin/search')`.
- **`GET /api/admin/search?q=&chip=`** returns the default `SpotlightResponse`, with groups customers, agencies, campaigns, orders and users. Each group has at most 5 items plus a `total`. A bare number ranks an exact order or campaign id first. Same permissions as the list pages. Target p95 under 150 ms on staging.
- **CI:** `spotlightRouteAudit(adminRoutes)` must be empty, and every static admin route must either be in the admin nav or marked `data.spotlight.hiddenFromNav`.
- Texts go through lingui; Danish comes in the end-of-platform i18n pass.

## 11. Delivery order and estimate

1. Core and tests: about 1.5–2 days.
2. PrimeNG adapter: about 0.5 day.
3. Kitchen sink and docs: about 0.5–1 day.
4. Release `21.0.0`.
5. Tivedo FR-087: about 1 day.

That is about 4 days of lane time in total.

## 12. Decisions log

| # | Decision | By |
|---|---|---|
| D1 | Build our own library rather than adopt ngx-command-palette (4 stars, single maintainer) or @ngxpert/cmdk (last release 2024-06) | Thomas, 2026-11-02 |
| D2 | Public, MIT, under tocDK, modelled on lingui-angular | Thomas, 2026-11-02 |
| D3 | One package with a headless core plus a `/primeng` secondary entry point; Material later | Thomas, 2026-11-02 |
| D4 | HTTP: a default grouped format, with global and per-source `request`/`map` overrides | Thomas, 2026-11-02 |
| D5 | Lean v1; nested pages and contextual commands come later (`children` reserved) | Thomas, 2026-11-02 |
| D6 | Texts via config (string, Signal or Observable); no i18n dependency; lingui shown in "Build your own" | Thomas, 2026-11-02 |
| D7 | Config-driven API (`provideSpotlight` + `<spotlight-host>`), not composable primitives | Thomas, 2026-11-02 |
| D8 | Hotkeys `ctrl.space` + `mod.k` by default | Thomas, 2026-11-02 |
| D9 | Name `@tocdk/ng-spotlight` | Thomas, 2026-11-02 |
