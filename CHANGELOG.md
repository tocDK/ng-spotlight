# Changelog

All notable changes to `@tocdk-oss/ng-spotlight` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: the major follows Angular's major;
minor and patch follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [21.1.0] - 2026-11-27

### Added
- `SpotlightService.clearRecent()` empties Recent at once, in memory and in storage, and `reloadRecent()` drops the
  in-memory list at once and reads storage again (it resolves when the new list is in place). An app with a
  per-user `SpotlightRecentStorage` calls `reloadRecent()` on logout or a user switch, so the previous user's items
  never show, whatever the render timing (#5). A Recent load that is still running when either is called no longer
  brings the old list back.

### Fixed
- The host elements of the renderer parts (input, chip, group header, row, badge), in the core and in the PrimeNG
  adapter, are now `display: contents`, so the core's layout rules reach the part markup. With PrimeNG the search
  field fills the input bar instead of staying about 200 px wide, a row icon sits inline next to its title instead of
  above it, and a group total keeps its gap from the label instead of reading `ORDERS1` (#4).
- A source error is logged with the source id as an argument (`'source "%s" failed'`), so a `%` in an id is not read
  as a console format specifier.

## [21.0.1] - 2026-11-02

First release published by GitHub Actions through npm trusted publishing, with provenance. No code changes from
21.0.0 (which was published once by hand to create the package on npm).

### Changed
- Release pipeline: published from `release.yml` via OIDC trusted publishing, with signed provenance.

## [21.0.0] - 2026-11-02

First release, published as `@tocdk-oss/ng-spotlight` (the `@tocdk` npm scope was not available, so the release
candidate's `@tocdk/ng-spotlight` name was never published).

### Added
- Headless core: `provideSpotlight`, `<spotlight-host>`, `SpotlightService`, the `spotlightTrigger`, `spotlightItem`,
  `spotlightEmpty` and `spotlightFooter` directives, hotkeys (`ctrl.space`, `mod.k`), keyboard navigation, chips,
  prefixes, Recent items (`localStorageRecent`), texts as strings, signals or observables.
- Composition: `provideSpotlight()` in a child injector (for example a lazy route) adds its sources and `http`
  defaults to the parent's palette and removes them when that injector is destroyed; `isolated: true` creates a
  separate palette with its own settings; a config factory (`provideSpotlight(() => config)`) runs in an injection
  context.
- Sources: `routeSource` (with lazy children), `staticSource`, `httpSource` (default grouped format with global and
  per-source `request`/`map` overrides) and the `spotlightRouteAudit` helper.
- `schema/spotlight-response.schema.json` for the HTTP response format.
- Default CSS-variable theme with a dark variant; `theme: 'none'`.
- `@tocdk-oss/ng-spotlight/primeng`: `provideSpotlightPrimeNG()` renderer adapter.
- Kitchen sink on GitHub Pages: <https://tocdk.github.io/ng-spotlight/>.
- Several palettes on one page: one hotkey press reaches exactly one of them (the open one, else the one opened most
  recently, else the `<spotlight-host>` created first).
- The public API is snapshotted in `api/` and checked in CI (`npm run check:api`).

### Changed (since the review of the release candidate)
- `SpotlightService` publishes only `open(query?)`, `close()`, `isOpen` and `selected`; its internal state is stripped
  from the `.d.ts`. `VERSION`, `DEFAULT_SPOTLIGHT_TEXTS`, `SpotlightGroupState`, `SpotlightOption`, `SpotlightChip`,
  and from `/primeng` `toneToSeverity`, `SpotlightPrimeTagSeverity` and `SPOTLIGHT_PRIMENG_CSS` are no longer exported.
- A `run()` action is awaited for at most 5 seconds before the palette closes; closing the palette also releases it.
  A late result still records Recent and emits `selected`.

### Security
- `url` actions: protocol-relative URLs (`//host`, `\\host`, `/\host`, with any tab, newline or leading control
  characters) are blocked; only path-relative URLs count as relative.

### Fixed
- Recent entries whose route has matrix params or outlets (plain JSON objects) survive a reload; a route that cannot
  be stored as JSON is kept by id and resolved through its source.
- The Recent ranking boost is keyed on source and item id, so a same-id item in another source is not boosted.

[Unreleased]: https://github.com/tocDK/ng-spotlight/compare/v21.1.0...HEAD
[21.1.0]: https://github.com/tocDK/ng-spotlight/releases/tag/v21.1.0
[21.0.1]: https://github.com/tocDK/ng-spotlight/releases/tag/v21.0.1
[21.0.0]: https://github.com/tocDK/ng-spotlight/releases/tag/v21.0.0
