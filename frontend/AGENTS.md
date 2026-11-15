---
description: Frontend engineering and validation instructions for willhaben-hunter-web.
---

# willhaben-hunter-web Frontend Instructions

These instructions apply to `frontend` and add to the repository-root instructions.

## Stack

- **Runtime & Framework:** Node `26.13.0`, Angular `^22.2.0` (Standalone components, Signals, `ChangeDetectionStrategy.OnPush`, `de-DE` locale).
- **Styling:** Tailwind CSS `^4.3.4` via `@tailwindcss/postcss` (`src/styles.css`), dark _Alpine Telemetry Lab_ palette.
- **Quality & Tests:** `angular-eslint` `^22.6.0`, Prettier `^3.8.1`, Vitest `^5.0.0` (`@angular/build:unit-test`) with `jsdom` and `@vitest/coverage-v8` (`80%` threshold across statements, branches, functions, lines).

## Documented workflows

- Before UI work in this frontend, read `DESIGN.md`; update it when design tokens or component styling change.

## Verification

Stage 1 (while working, from `frontend/`):

```bash
npx ng test --watch=false --include src/app/<path>.spec.ts
npx eslint src/app/<path>.ts
npx prettier --check src/app/<path>.ts
```

Stage 2 (finish gates, from `frontend/`):

```bash
npm run format:check
npm run lint
npm run test:ci
npm run build
```

## Conventions

- **Component & State Style:** Use standalone components with `ChangeDetectionStrategy.OnPush`, `host: { class: 'block' }`, `inject()`, Signal inputs/outputs (`input()`, `output()`), and central `SessionStore` (`src/app/core/session/session.store.ts`).
- **Single Source of Truth:** Never import `willhaben-hunter` in the browser bundle; load selectable options and limit bounds from `GET /api/meta`.
- **Link & Export Safety:** Render external listing/search links strictly through `SafeWillhabenUrlPipe` (`https://www.willhaben.at/` prefix check), and keep `serializeItemsToCsv` RFC 4180-quoted with formula-injection prefixing (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **API Proxy:** Local `ng serve` proxies `/api/**` to `http://127.0.0.1:8000` via `src/proxy.conf.json`.

## Testing

- **Runner:** Angular `@angular/build:unit-test` (Vitest + `jsdom`), matching `src/**/*.spec.ts`.
- **Mocks & Fixtures:** Mock `WillhabenApiService` or use `provideHttpClientTesting()` (`HttpTestingController`) against `contracts/fixtures/*.json`; test `localStorage` `QuotaExceededError` fallback, CSV round-trip parsing, and DOM link safety.
