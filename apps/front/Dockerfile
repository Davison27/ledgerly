FROM node:22-alpine AS base
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/back/package.json apps/back/package.json
COPY apps/front/package.json apps/front/package.json
RUN pnpm install --frozen-lockfile --filter @ledgerly/front...

FROM deps AS build
COPY apps/front apps/front
RUN printf 'VITE_API_URL=/api\n' > apps/front/.env.production
RUN pnpm --filter @ledgerly/front build

FROM caddy:2.11-alpine
COPY --from=build /app/apps/front/dist /srv
COPY apps/front/Caddyfile /etc/caddy/Caddyfile
