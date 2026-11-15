# Stage 1: Build Frontend (Angular 22) & Backend (TypeScript -> CommonJS)
FROM node:26-alpine AS builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 2: Production Runtime with Playwright Chromium Headless Shell
FROM node:26-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    HOST=0.0.0.0 \
    PORT=8000 \
    STATIC_DIR=/app/static

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && \
    npx playwright install --with-deps --only-shell chromium && \
    chmod -R a+rX /ms-playwright && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /root/.npm

RUN groupadd --gid 10001 willhaben && \
    useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin willhaben

COPY --from=builder --chown=10001:10001 /build/backend/dist /app/backend/dist
COPY --from=builder --chown=10001:10001 /build/frontend/dist/frontend/browser /app/static

USER 10001:10001
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8000/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "dist/server.js"]
