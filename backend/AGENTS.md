---
description: Backend engineering and validation instructions for willhaben-hunter-web.
---

# willhaben-hunter-web Backend Instructions

These instructions apply to `backend` and add to the repository-root instructions.

## Stack

- **Runtime & Language:** Node `26.13.0` (`.node-version`), TypeScript `~6.0.2` (`CommonJS` build via `tsconfig.build.json`).
- **Web & Validation:** Fastify `^5.8.0`, `@fastify/static` `^9.0.0`, Zod `^4.0.0`.
- **Scraping & AI:** `willhaben-hunter` `^1.1.0` (Playwright Chromium), `@anthropic-ai/sdk` `^0.80.0` (`claude-haiku-5-5`).
- **Quality & Tests:** ESLint `^10.7.0`, Prettier `^3.8.1`, Vitest `^4.1.10` with `@vitest/coverage-v8` (`80%` threshold across statements, branches, functions, lines).

## Verification

Stage 1 (while working, from `backend/`):

```bash
npx vitest run tests/<file>.spec.ts
npx eslint src/<file>.ts tests/<file>.spec.ts
npx prettier --check src/<file>.ts tests/<file>.spec.ts
```

Stage 2 (finish gates, from `backend/`):

```bash
npm run format:check
npm run lint
npm run test:ci
npm run build
```

## Conventions

- **Mode Adapter Boundary:** Route Marktplatz requests through `src/modes/mode-registry.ts` and `src/modes/marketplace.mode.ts` rather than instantiating `willhaben-hunter` scrapers directly in routes.
- **Worker Isolation & Single-Flight Lock:** Fork scrapes via `ScraperService` (`src/services/scraper.service.ts`) running `src/workers/scrape.worker.ts` in a detached process group; release the lock only on worker `exit`, and terminate the process group (`SIGKILL`) on `SCRAPE_TIMEOUT_MS` (`600000`) or Fastify shutdown.
- **Untrusted Data & Server-Side Join:** Validate `POST /api/analyze` payloads (`bodyLimit: 10 MiB`), truncate `description`/`attributes` to `1,500` chars within `ANALYZE_MAX_INPUT_CHARS`, force `record_willhaben_analysis` tool output, and copy `title`, `price`, and `url` exclusively from the matching input item by `id`.
- **No CORS Middleware:** Frontend and API are served same-origin by Fastify; do not register `@fastify/cors`.

## Testing

- **Runner:** Vitest (`environment: 'node'`, `tests/**/*.spec.ts`), excluding `src/server.ts` and `src/smoke.ts` from unit coverage.
- **Isolation:** Mock `forkFactory`/`killProcessGroup` in `ScraperService` specs, mock `WillhabenHunterMarketplaceScraper` in worker specs, and mock `AnthropicClientLike` in `AnalyzerService` and route specs; never hit live `willhaben.at` or Anthropic APIs in unit tests.
- **Contracts:** `tests/contracts.spec.ts` asserts `contracts/fixtures/*.json` validate against the Zod schemas and `meta.json` matches `buildMetaResponse()`.
