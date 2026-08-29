FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app/server

COPY packages/protocol/package.json /app/packages/protocol/package.json
COPY packages/protocol/src /app/packages/protocol/src
COPY packages/protocol/tsconfig.json /app/packages/protocol/tsconfig.json
COPY server/package.json server/pnpm-lock.yaml server/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app/server

COPY packages/protocol /app/packages/protocol
COPY server .
RUN pnpm build

FROM base AS runtime
WORKDIR /app/server

ENV NODE_ENV=production

COPY packages/protocol/package.json /app/packages/protocol/package.json
COPY packages/protocol/src /app/packages/protocol/src
COPY packages/protocol/tsconfig.json /app/packages/protocol/tsconfig.json
COPY server/package.json server/pnpm-lock.yaml server/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/packages/protocol/dist /app/packages/protocol/dist
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/jsons ./jsons
COPY --from=build /app/server/mapas_source ./mapas_source

EXPOSE 7666

CMD ["node", "dist/server.js"]
