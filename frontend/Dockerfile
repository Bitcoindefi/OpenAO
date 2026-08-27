# Build context: the REPO ROOT (see frontend/docker-compose*.yml and CI).
# The frontend image needs the optimized world maps, which are not in git
# (frontend/.gitignore). They are generated from server/mapas_source/ by the
# server's export-frontend-maps script, so the maps stage below runs that
# script before the Next.js build. A clean clone + docker build now produces
# a frontend that renders the world.

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# --- Stage 1: generate frontend/public/maps_optimized from server/mapas_source ---
FROM base AS maps
WORKDIR /maps/server

COPY server/package.json server/pnpm-lock.yaml server/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY server/src/mapNpcStorage.ts ./src/mapNpcStorage.ts
COPY server/src/scripts/exportFrontendOptimizedMaps.ts ./src/scripts/exportFrontendOptimizedMaps.ts
COPY server/mapas_source ./mapas_source

# Fails loudly ("No se encontraron mapas para exportar.") if the sources are missing.
RUN pnpm exec tsx src/scripts/exportFrontendOptimizedMaps.ts --output-dir=/maps/out \
    && test "$(ls /maps/out | grep -c '^mapa_')" -gt 0

# --- Stage 2: frontend dependencies ---
FROM base AS deps
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
COPY frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage 3: build ---
FROM deps AS build
WORKDIR /app

ARG API_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=ws://localhost:7666
ARG NEXT_PUBLIC_AOWEB_TEST_MODE=false
ARG NEXT_PUBLIC_SITE_URL=https://aoweb.app
ARG SITE_URL=https://aoweb.app
ARG NEXT_ASSET_CDN_URL
ARG NEXT_ASSET_CDN_PREFIX
ARG NEXT_BUILD_ID
ARG DO_SPACES_ENDPOINT
ARG DO_SPACES_REGION=nyc3
ARG DO_SPACES_BUCKET
ARG DO_SPACES_ACCESS_KEY_ID
ARG DO_SPACES_SECRET_ACCESS_KEY
ARG GAME_DATA_ADMIN_PROXY_TOKEN

ENV API_BASE_URL=$API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_AOWEB_TEST_MODE=$NEXT_PUBLIC_AOWEB_TEST_MODE
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SITE_URL=$SITE_URL
ENV NEXT_BUILD_ID=$NEXT_BUILD_ID
ENV GAME_DATA_ADMIN_PROXY_TOKEN=$GAME_DATA_ADMIN_PROXY_TOKEN

COPY frontend/ .
# Generated maps land after the source copy: drop anything stale that came in
# with the context, then copy the freshly generated maps on top.
RUN rm -rf public/maps_optimized
COPY --from=maps /maps/out ./public/maps_optimized
RUN pnpm build

# --- Stage 4: runtime ---
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY frontend/package.json frontend/pnpm-lock.yaml ./
COPY frontend/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["pnpm", "start"]
