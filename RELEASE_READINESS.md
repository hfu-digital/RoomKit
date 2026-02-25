# RoomKit v1.0 Release Readiness Analysis

> Generated 2026-02-25. Based on a thorough review of every source file, build pipeline, test suite, and publish configuration.

## Executive Summary

RoomKit is **architecturally mature** — the domain model, storage abstraction, and DI patterns are production-quality. However, there are **blockers** that must be fixed before publishing, plus several gaps that would be expected in a credible v1.0 open-source release.

**Current state: ~80% ready.** The 20% gap is mostly polish, packaging, and test coverage — not missing core functionality.

---

## BLOCKERS (must fix before publish)

### 1. Build is broken — `crypto` not in TypeScript lib

**Severity: P0 — blocks `bun run build` and `bun run typecheck`**

```
src/seeder.ts(28,12): error TS2304: Cannot find name 'crypto'.
```

`tsconfig.base.json` sets `"lib": ["ES2022"]`, which does not include the Web Crypto API global. The `crypto.randomUUID()` call in `seeder.ts` (and likely elsewhere) needs one of:

- Add `"DOM"` to the `lib` array (heavy-handed)
- Add `/// <reference types="bun-types" />` (Bun provides `crypto` globally)
- Or simply declare the one function used: `declare const crypto: { randomUUID(): string };`

**Impact**: CJS + ESM bundles emit fine, but `.d.ts` generation fails, so **no type declarations ship**. Consumers would get a JS-only package with zero IntelliSense.

### 2. Missing `"exports"` field in both package.json files

Both `@hfu.digital/roomkit-nestjs` and `@hfu.digital/roomkit-react` use the legacy `main`/`module`/`types` triple. Modern Node (>=16.x) and bundlers increasingly rely on the `"exports"` map. Without it:

- `import "@hfu.digital/roomkit-nestjs"` may resolve incorrectly in ESM-only projects
- Subpath imports (if ever needed) are impossible
- TypeScript `"moduleResolution": "bundler"` resolves correctly, but `"node16"` does not

**Fix**: Add a conditional exports map:
```json
"exports": {
    ".": {
        "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
        "require": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    }
}
```

### 3. Missing `repository`, `homepage`, `bugs`, `keywords` in package.json

npm renders these on the package page. Without them:
- No link back to GitHub
- No issue tracker link
- Package is invisible in npm search (no keywords)

---

## HIGH PRIORITY (strongly recommended for v1.0)

### 4. No frontend tests — zero coverage

`@hfu.digital/roomkit-react` has **0 test files**. The backend has 121 passing tests across 6 files, but the frontend ships completely untested. At minimum, test:

- `ApiClient` — request/error/abort behavior
- Each hook — loading/success/error states, abort on unmount
- Key components — render output, callback invocation

### 5. Backend test gaps — optional services untested

These services have no dedicated test files:
- `AvailabilityService` (326 lines, complex scoring/pagination)
- `TravelTimeService` (195 lines)
- `ExamService` (202 lines)
- `BulkOperationService` (401 lines)

Missing mocks: `ExamStorage`, `BulkOperationStorage`.

### 6. No CHANGELOG

There is no `CHANGELOG.md`. For a v1.0 release, consumers expect at least a single entry documenting the initial feature set. This is also referenced by the publish workflow (GitHub Releases).

### 7. CI workflow missing `.npmrc` / registry config

The publish job uses `bunx npm publish --access public --provenance` but never configures the npm registry or authentication. The `NODE_AUTH_TOKEN` env var is set, but there's no `setup-node` step or `.npmrc` template to wire it to the registry. Publish will fail in CI.

### 8. `@swc/core` not installed — decorator metadata warning

The build emits:
```
You have emitDecoratorMetadata enabled but @swc/core was not installed, skipping swc plugin
```

NestJS DI depends on `emitDecoratorMetadata` for constructor injection. Without `@swc/core`, tsup falls back to TypeScript's own emit, which works but is slower and may produce subtly different output. Either:
- Add `@swc/core` as a dev dependency
- Or remove the warning by disabling `emitDecoratorMetadata` in tsup and relying on explicit `@Inject()` tokens (the codebase already uses injection tokens, so this is likely safe)

---

## MEDIUM PRIORITY (recommended but not blocking)

### 9. Frontend `ApiClient` is minimal

The API client (58 lines) has no:
- Retry logic / exponential backoff
- Typed error responses (throws generic `Error`)
- Timeout handling
- Request/response interceptors
- Auth token management (only passes through `fetchOptions`)

For a v1.0, this limits real-world usability. Consumers would likely wrap it immediately.

### 10. No `sideEffects: false` in package.json

Both packages should declare `"sideEffects": false` so bundlers can tree-shake unused exports. Without this, importing one hook pulls the entire bundle.

### 11. `RecurrenceService` throws generic `Error` instead of domain errors

Four throw sites use `new Error(...)` instead of `RoomKitError` subclasses:
- "Booking not found" (2x)
- "Booking not part of a recurrence series"
- "Recurrence rule not found" (2x)

Consumers catching `RoomKitError` would miss these.

### 12. Lockfile not committed

`.gitignore` excludes `bun.lock`. The CI workflow uses `--frozen-lockfile`, which requires the lockfile to exist. Either commit it or remove `--frozen-lockfile` from CI.

### 13. No linter / formatter configured

There is no ESLint, Biome, or Prettier configuration. For an open-source project accepting contributions, this leads to inconsistent code style. The CONTRIBUTING.md references "4-space indentation (enforced)" but nothing actually enforces it.

---

## LOW PRIORITY (nice to have)

### 14. Examples are skeleton-only

Both example apps (`nestjs-api`, `nextjs-app`) have source files but can't run without:
- A database + Prisma schema + migrations
- `bun install` in each example (no `bun.lock`)
- The NestJS example references `PrismaService` but has no Prisma schema

They work as code references but aren't runnable out of the box. A `docker-compose.yml` with Postgres + seed script would make the examples actually usable.

### 15. No JSDoc on public API surface

The CONTRIBUTING.md says "Add JSDoc for public methods" but most services and hooks have no JSDoc. TypeScript types provide basic signatures, but usage guidance (param descriptions, thrown errors, examples) is absent.

### 16. Missing GitHub templates

No issue templates, PR template, or `SECURITY.md`. Standard for open-source projects but not a publishing blocker.

### 17. Components lack form validation display

`BookingForm` performs no client-side validation and has no mechanism to display validation errors from the server. Users would see silent failures.

### 18. `JSON.stringify` for hook dependency comparison

Several hooks use `JSON.stringify(params)` in `useEffect` dependency arrays. This is brittle (key ordering, `undefined` vs missing keys) and can cause missed or unnecessary re-renders.

---

## Checklist: Minimum Viable v1.0

```
[ ] Fix crypto type error (add to lib or declare global)
[ ] Add "exports" field to both package.json files
[ ] Add repository/homepage/bugs/keywords to both package.json files
[ ] Add sideEffects: false to both package.json files
[ ] Fix CI publish job (add .npmrc or setup-node registry config)
[ ] Commit bun.lock or remove --frozen-lockfile from CI
[ ] Add CHANGELOG.md with initial release entry
[ ] Add @swc/core dev dependency or suppress warning
[ ] Replace generic Error throws in RecurrenceService with domain errors
[ ] Add at minimum: ApiClient tests, hook tests (frontend)
[ ] Add AvailabilityService tests (backend)
```

## What's NOT missing

The analysis also confirmed that these areas are solid:

- **All 11 storage interfaces**: fully implemented in Prisma adapters
- **All 13 domain services**: complete, no stubs
- **15 error classes**: proper hierarchy with codes + context
- **EventBus**: 12 typed events, discriminated union
- **Barrel exports**: comprehensive in both packages
- **Seeder**: realistic data generation (503 lines)
- **State machine**: complete with exhaustive transition tests
- **Prisma independence**: zero `@prisma/client` imports in source
- **Frontend components (10) and hooks (12)**: all implemented
- **Frontend types**: aligned with backend entities
- **README**: comprehensive with quick-start, API reference, architecture docs
- **LICENSE**: MIT
- **CONTRIBUTING.md**: present with guidelines
- **CI workflow**: build + typecheck + test + publish pipeline exists
