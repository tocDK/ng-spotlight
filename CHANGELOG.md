# Changelog

All notable changes to `@tocdk/ng-spotlight` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: the major follows Angular's major;
minor and patch follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Headless core: `provideSpotlight`, `<spotlight-host>`, `SpotlightService`, the `spotlightTrigger`, `spotlightItem`,
  `spotlightEmpty` and `spotlightFooter` directives, hotkeys (`ctrl.space`, `mod.k`), keyboard navigation, chips,
  prefixes, Recent items (`localStorageRecent`), texts as strings, signals or observables.
- Sources: `routeSource` (with lazy children), `staticSource`, `httpSource` (default grouped format with global and
  per-source `request`/`map` overrides) and the `spotlightRouteAudit` helper.
- `schema/spotlight-response.schema.json` for the HTTP response format.
- Default CSS-variable theme with a dark variant; `theme: 'none'`.
- `@tocdk/ng-spotlight/primeng`: `provideSpotlightPrimeNG()` renderer adapter.
- Kitchen sink on GitHub Pages: <https://tocdk.github.io/ng-spotlight/>.

[Unreleased]: https://github.com/tocDK/ng-spotlight/commits/main
