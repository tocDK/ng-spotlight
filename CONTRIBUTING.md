# Contributing to @tocdk/ng-spotlight

PRs are welcome. Every change lands through a pull request against `main`; branch names follow
`toc/<topic>-<short-description>`. Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes
(`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`, `refactor:`).

## Setup

```bash
git clone https://github.com/tocDK/ng-spotlight.git
cd ng-spotlight
npm install
```

## Commands

| Command | What it does |
|---|---|
| `npm start` | Kitchen sink at http://localhost:4200 |
| `npm test` | All vitest projects (lib, demo, tooling) |
| `npm run test:lib` / `npm run test:demo` | One project |
| `npm run test:coverage` | With coverage thresholds (≥ 90 % lines/functions/statements, ≥ 85 % branches) |
| `npm run lint` | ESLint |
| `npm run build:lib` | ng-packagr → `dist/ng-spotlight/` (core + `/primeng`) |
| `npm run check:size` | Core bundle ≤ 15 kB gzipped (run after `build:lib`) |
| `npm run build:demo` | Kitchen sink with the GitHub Pages base href |
| `npm run check:docs` | Every public export is documented in a kitchen-sink content module |
| `npm run check:workflows` | Workflow hygiene (pinned SHAs, no persisted credentials, permissions, no `${{ }}` in `run:`) |

## Adding a feature

1. Write the failing test first (vitest, jsdom; every TestBed adds `provideZonelessChangeDetection()`).
2. Implement it. Keep ARIA in the host; renderer parts only render markup.
3. Add or update a kitchen-sink example (`projects/kitchen-sink/src/app/examples/<key>.example.ts`) and its content page.
4. `npm test`, `npm run lint` and `npm run check:docs` must pass.
5. Add a CHANGELOG entry under `[Unreleased]`.

## Workflow rules

Pin every action to a full commit SHA with a version comment, set `persist-credentials: false` on checkout, grant
permissions per job only, and pass values into `run:` through `env:`. `npm run check:workflows` enforces this.

## Releasing (operator only)

Publishing happens only when the operator pushes a version tag.

One-time setup, before the first tag:
1. npm auth: create an automation token for the `@tocdk` scope and save it as the repository secret `NPM_TOKEN`
   (or configure npm trusted publishing for this repository and workflow `release.yml`, then delete the secret).
2. GitHub: create the environment `npm` (Settings → Environments) with yourself as required reviewer, so every
   publish waits for approval.
3. GitHub Pages: Settings → Pages → Source: GitHub Actions.

Each release:
1. Bump `projects/ng-spotlight/package.json` and `projects/ng-spotlight/src/lib/version.ts`, move the
   `[Unreleased]` CHANGELOG entries under the new version, merge to `main`.
2. `git tag v<version> && git push origin v<version>`.
3. Approve the `npm` environment in the release run. The workflow checks the tag against the package version, runs
   the tests, builds, publishes with provenance and creates the GitHub release.
