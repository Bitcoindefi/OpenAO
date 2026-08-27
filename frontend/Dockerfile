FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
COPY frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS map-export
WORKDIR /server

COPY server/package.json server/pnpm-lock.yaml ./
COPY server/pnpm-workspace.yaml server/tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY server/src ./src
COPY server/mapas_source ./mapas_source
RUN pnpm run export-frontend-maps -- --output-dir=/maps_optimized

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

COPY frontend/. .
COPY --from=map-export /maps_optimized ./public/maps_optimized
RUN pnpm build

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
