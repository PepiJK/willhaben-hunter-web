---
description: Main instructions for Willhaben Hunter Web, covering tech stack, test-first workflow, API contracts, worker isolation, and pepnet.at deployment rules.
---

# AGENTS.md — Willhaben Hunter Web Agent Guide

## Broad Tech Stack

- **Backend (`backend/`):** Node `26.13.0`, TypeScript `~6.0`, Fastify `^5`, Zod `^4`, `willhaben-hunter` `^1.1.0` (Playwright Chromium), `@anthropic-ai/sdk` (`claude-haiku-5-5`).
- **Frontend (`frontend/`):** Angular `22.2` Standalone SPA (`OnPush`, Signals), Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Quality:** ESLint, Prettier (`format:check`), Vitest (`>= 80%` coverage thresholds in both `backend/` and `frontend/`).
- **CI/CD:** `.github/workflows/ci.yml` (gates + in-container smoke scrape) and `.github/workflows/cd.yml` (GHCR build/push + `pepnet.at` rollout).

## Documented workflows

- For Backend work, read `backend/AGENTS.md`.
- For Frontend work, read `frontend/AGENTS.md`.
- Before creating a branch, read `docs/agents/branch-template.md`.
- Before creating a commit, read `docs/agents/commit-template.md`.
- Before creating an issue or work item, read `docs/agents/issue-template-guidance.md`.
- Before creating or updating a pull request, read `docs/agents/pull-request-template.md`.
- Before creating a release, read `.github/release_template.md`.
- Before locating code or doing structural or cross-component work, read `ARCHITECTURE.md`; update it in the same change when structure, components, data stores, integrations, or invariants change, and add each settled domain term to its Domain language section as `**Term**:` with a one- or two-sentence definition followed by `_Avoid_:` synonyms.
- Before working in an area, read the ADRs in `docs/adr/` that touch it and flag any conflict explicitly; record a decision without asking when it is hard to reverse, surprising without context, and the result of a real trade-off, using `docs/adr/NNNN-kebab-slug.md` with a short title and 1-3 sentences on context, decision, and why, and supersede rather than rewrite a changed decision.

## Contracts and generated code

- Canonical JSON fixtures in `contracts/fixtures/` (`meta.json`, `scrape-job-running.json`, `scrape-job-succeeded.marketplace.json`, `analyze-response.json`, `cli-export.marketplace.json`) are validated against backend Zod schemas in `backend/tests/contracts.spec.ts` and imported directly by frontend Vitest specs.
- Hand-written TypeScript mirrors in `frontend/src/app/core/api/willhaben-api.models.ts` must stay compatible with `backend/src/schemas/*.ts`; no build-time codegen step is used, and enum values come at runtime from `GET /api/meta`.

## 1. Project & Stack Overview

**Willhaben Hunter Web** (`https://willhaben.pepnet.at`) is a single-container Marktplatz (`marketplace`) search, JSON/CSV export/import, and Anthropic Claude Haiku 5.5 (`claude-haiku-5-5`) listing analyzer web application built on [`willhaben-hunter`](../willhaben-hunter/README.md) (`v1.1.0`) and deployed on `pepnet.at` behind Caddy HTTP Basic Auth.

- **Backend (`backend/`)**: Node `26.13.0` (`npm 11.20.0`, `.node-version`), TypeScript `~6.0`, Fastify `^5` (`@fastify/static` SPA host), `zod` request/response validation, `willhaben-hunter` (`^1.1.0`), `@anthropic-ai/sdk` (`claude-haiku-5-5`). Scrapes run in isolated forked worker processes (`dist/workers/scrape.worker.js`) with a single-flight lock and a 10-minute (`600000 ms`) hard timeout.
- **Frontend (`frontend/`)**: Node `26.13.0` (`npm 11.20.0`), Angular `22.2` Standalone SPA (`ChangeDetectionStrategy.OnPush`, Signals), Tailwind CSS v4 (`@tailwindcss/postcss`), *Alpine Telemetry Lab* design system (`frontend/DESIGN.md`).
- **Shared Contracts (`contracts/fixtures/`)**: Canonical JSON payloads (`meta.json`, `scrape-job-running.json`, `scrape-job-succeeded.marketplace.json`, `analyze-response.json`, `cli-export.marketplace.json`) validated by both backend (`zod`) and frontend unit test suites.
- **Container & Deploy**: Multi-stage `Dockerfile` (`node:26-alpine` builder + `node:26-bookworm-slim` runtime with Playwright `chromium-headless-shell`), `docker-compose.yml` (`mem_limit: 1024m`, `shm_size: 256m`, `init: true`, `pepnet_web_net`), `deploy/Caddyfile.willhaben.snippet`, `.github/workflows/{ci,cd}.yml`.
- **Quality Gates**: ESLint, Prettier (`format:check`), and Vitest (**`>= 80%` unit test coverage** across statements, branches, functions, and lines via `@vitest/coverage-v8`) in both `backend/` and `frontend/`.

---

## 2. Canonical Documentation

Read the relevant specification before making changes and update it in the same change whenever endpoints, schemas, worker behavior, or UI components evolve:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, worker/lock/10-minute-timeout model, mode adapter design, API endpoints, Anthropic tool-choice join pipeline, security invariants, and domain language.
- [`frontend/DESIGN.md`](./frontend/DESIGN.md) — *Alpine Telemetry Lab* palette, typography (`tabular-nums`), sticky table headers, and component layout rules.
- [`README.md`](./README.md) — Quickstart, environment variables, CLI smoke test, and deployment summary.
- [`../pepnet/AGENTS.md`](../pepnet/AGENTS.md) & [`../pepnet/docs/willhaben.md`](../pepnet/docs/willhaben.md) — `pepnet.at` VPS highway, SSH boundaries (`ssh pepnet-llm`), and server layout.

---

## 3. Development & Verification Workflow (Strict Test-First Order)

### Step 1: Red → Green → Refactor (TDD & ≥ 80% Coverage)
1. **Red**: Write or update failing unit/integration tests first (`backend/tests/*.spec.ts` or `frontend/src/**/*.spec.ts`).
2. **Green**: Implement the minimal code required to pass the tests.
3. **Refactor**: Clean up code while keeping unit test coverage **≥ 80%** across statements, branches, functions, and lines in both `backend/` and `frontend/`.

### Step 2: Format → Lint → Test → Build

#### Backend (`backend/`)
```bash
cd backend
npm run format          # 1. Format code (Prettier)
npm run format:check    # 2. Verify formatting
npm run lint            # 3. Lint (ESLint)
npm run test:ci         # 4. Run Vitest suite (enforces >= 80% coverage)
npm run build           # 5. Compile TypeScript (dist/)
```

#### Frontend (`frontend/`)
```bash
cd frontend
npm run format          # 1. Format code (Prettier)
npm run format:check    # 2. Verify formatting
npm run lint            # 3. Lint (ESLint / angular-eslint)
npm run test:ci         # 4. Run headless Vitest suite (enforces >= 80% coverage)
npm run build           # 5. Build production bundle (dist/frontend/browser)
```

### Step 3: Container & Live Smoke Scrape Verification
```bash
docker compose build
docker compose up -d
curl -fsS http://127.0.0.1:8001/api/healthz
docker exec willhaben-web node dist/smoke.js
```

---

## 4. Operator vs. AI Agent Responsibilities on `pepnet.at`

1. **AI Agents (`ssh pepnet-llm`)**:
   - Connect strictly as unprivileged user `llm` (`uid=1001`) via `ssh pepnet-llm`.
   - Permitted read-only diagnostics:
     - `ssh pepnet-llm "sudo docker ps && sudo docker stats --no-stream"`
     - `ssh pepnet-llm "sudo docker logs --tail 50 willhaben-web"` / `--tail 100 willhaben-web`
     - `ssh pepnet-llm "curl -fsS http://127.0.0.1:8001/api/healthz"`
   - **Never** connect as `josef` (`ssh pepnet.at`), build Docker images on the VPS, or use wildcard `sudoers` rules.
2. **Operator (`josef`)**:
   - Owns `/opt/pepnet/willhaben-hunter-web/.env` (`0600 josef:josef`), `/opt/pepnet/caddy/Caddyfile`, GitHub repository secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`), and GitHub Releases (`cd.yml` rollout).
