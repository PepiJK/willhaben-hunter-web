# Willhaben Hunter Web (`willhaben.pepnet.at`)

Web UI, asynchronous stealth-scraping job service, JSON/CSV workbench, and **Anthropic Claude Haiku 5.5 (`claude-haiku-5-5`)** listing analyzer for **Willhaben Marktplatz (`marketplace`)**, powered by [`willhaben-hunter`](https://www.npmjs.com/package/willhaben-hunter) (`v1.1.0`).

---

## Features

1. **Marktplatz Search Workbench**: Configure keyword (`query`), price bounds (`priceMin`, `priceMax`), all 9 Austrian Bundesländer (`area`), Vienna districts `1–23` (`wienDistricts`), sort order (`relevanz`, `neueste`, `preis-aufsteigend`, `preis-absteigend`), item limit (`1..100` with details, `1..250` with `skipDetails`), and detail-page toggle.
2. **Isolated, Time-Bounded Background Scraping**: Runs each Playwright + stealth Chromium scrape in a detached child process with a strict single-flight lock, real-time progress polling (`GET /api/scrape/:jobId`), automatic tab re-attachment on `409` or page reload, and a hard **10-minute (`600000 ms`)** process-group timeout.
3. **CLI JSON Import & Formula-Safe Export**: Upload or paste existing `willhaben-hunter` CLI JSON exports without re-scraping, or download active listings as `.json` or RFC 4180 `.csv` (with spreadsheet formula-injection protection).
4. **Claude Haiku 5.5 Listing Analyzer (`POST /api/analyze`)**: Evaluate loaded listings against custom instructions or one-click German preset prompts using forced structured tool output (`claude-haiku-5-5`), prompt-injection hardening, and server-side joining of `title`, `price`, and `url` from verified input items.
5. **Alpine Telemetry Lab UI**: Built with Angular 22.2 Standalone components (`OnPush`, Signals) and Tailwind CSS v4 following [`frontend/DESIGN.md`](./frontend/DESIGN.md).

---

## Quickstart (Local Development)

### Prerequisites
- Node.js `26.13.0` (`npm 11.20.0`)
- Docker & Docker Compose (for containerized Chromium verification)

### 1. Backend (`backend/`)
```bash
cp .env.example .env
cd backend
npm ci
npm run format:check
npm run lint
npm run test:ci
npm run build
```

### 2. Frontend (`frontend/`)
```bash
cd frontend
npm ci
npm run format:check
npm run lint
npm run test:ci
npm run build
```

### 3. Container Build & Smoke Scrape
```bash
docker network create pepnet_web_net || true
docker compose up --build -d
curl -fsS http://127.0.0.1:8001/api/healthz
docker exec willhaben-web node dist/smoke.js
```

---

## Documentation

- [`AGENTS.md`](./AGENTS.md) — Agent workflow, TDD rules, and `pepnet.at` access boundaries
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Architecture, endpoints, worker lifecycle, and invariants
- [`frontend/DESIGN.md`](./frontend/DESIGN.md) — *Alpine Telemetry Lab* design system
