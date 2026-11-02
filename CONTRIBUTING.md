# Contributing to @tocdk-oss/ng-spotlight

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
| `npm run test:coverage` | With coverage thresholds (statements 98 %, branches 95 %, functions 98 %, lines 99 %; the same bar for `/primeng` on its own) |
| `npm run lint` | ESLint |
| `npm run build:lib` | ng-packagr → `dist/ng-spotlight/` (core + `/primeng`) |
| `npm run check:size` | Core bundle ≤ 15 kB gzipped (run after `build:lib`) |
| `npm run check:api` | The built `.d.ts` of `.` and `./primeng` matches the snapshots in `api/` (run after `build:lib`; `-- --update` rewrites them) |
| `npm run build:demo` | Kitchen sink with the GitHub Pages base href |
| `npm run check:docs` | Every public export is documented in a kitchen-sink content module |
| `npm run check:workflows` | Workflow hygiene (pinned SHAs, no persisted credentials, permissions, no `${{ }}` in `run:`) |

## Adding a feature

1. Write the failing test first (vitest, jsdom; every TestBed adds `provideZonelessChangeDetection()`).
2. Implement it. Keep ARIA in the host; renderer parts only render markup.
3. Add or update a kitchen-sink example (`projects/kitchen-sink/src/app/examples/<key>.example.ts`) and its content page.
4. `npm run test:coverage`, `npm run lint` and `npm run check:docs` must pass. If the public API changes on purpose,
   run `npm run build:lib && npm run check:api -- --update` and commit `api/`; internal members get an `@internal`
   JSDoc tag so they stay out of the published `.d.ts`.
5. Add a CHANGELOG entry under `[Unreleased]`.

## Workflow rules

Pin every action to a full commit SHA with a version comment, set `persist-credentials: false` on checkout, grant
permissions per job only, and pass values into `run:` through `env:`. `npm run check:workflows` enforces this.

## Releasing (operator only)

Publishing happens only when the operator pushes a version tag.

One-time setup (done 2026-11-02 unless marked):
1. npm auth is **trusted publishing (OIDC)**: `release.yml` has no npm token or secret.
   - npm only lets you add a trusted publisher to a package that already exists on the registry (it has no
     "pending publisher"). So the **first** publish of `@tocdk-oss/ng-spotlight` is done once by hand (still to do):
     build and pack locally (`npm ci && npm run build:lib && cd dist/ng-spotlight && npm pack`), then
     `npm login` and `npm publish ./tocdk-oss-ng-spotlight-21.0.0.tgz --access public` (or use a one-off granular
     token and revoke it afterwards).
   - Then on npmjs.com → the package → Settings → Trusted publishing → GitHub Actions: owner `tocDK`, repository
     `ng-spotlight`, workflow `release.yml`, environment `npm`. Optionally set "Require two-factor authentication
     and disallow tokens" under publishing access.
   - From then on every release is tag → approve → publish, with no secret. The publish job runs on Node 24
     (npm 11, which trusted publishing needs: npm >= 11.5.1) and provenance is generated automatically.
2. GitHub environment `npm` with required reviewer `tocDK` and a deployment policy that allows only `v*` tags: done.
3. GitHub Pages with source "GitHub Actions" (https://tocdk.github.io/ng-spotlight/): done.

Each release:
1. Bump `projects/ng-spotlight/package.json`, move the
   `[Unreleased]` CHANGELOG entries under the new version, merge to `main`.
2. `git tag v<version> && git push origin v<version>`.
3. Approve the `npm` environment in the release run. The `build` job (read-only) checks the tag against the package
   version, runs the tests, builds and packs the library; the `publish` job (environment `npm`) publishes that
   tarball through trusted publishing (with provenance), without installing dependencies, and creates the GitHub release.
