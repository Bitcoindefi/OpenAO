FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app/frontend

COPY packages/protocol/package.json /app/packages/protocol/package.json
COPY packages/protocol/src /app/packages/protocol/src
COPY packages/protocol/tsconfig.json /app/packages/protocol/tsconfig.json
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app/frontend

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

COPY packages/protocol /app/packages/protocol
COPY frontend .
RUN pnpm build

FROM base AS runtime
WORKDIR /app/frontend

ENV NODE_ENV=production
ENV PORT=3000

COPY packages/protocol/package.json /app/packages/protocol/package.json
COPY packages/protocol/src /app/packages/protocol/src
COPY packages/protocol/tsconfig.json /app/packages/protocol/tsconfig.json
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/packages/protocol/dist /app/packages/protocol/dist
COPY --from=build /app/frontend/.next ./.next
COPY --from=build /app/frontend/public ./public
COPY --from=build /app/frontend/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["pnpm", "start"]
