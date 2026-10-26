FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS base
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc .pnpmfile.cjs ./
COPY apps/back/package.json apps/back/package.json
COPY apps/front/package.json apps/front/package.json
RUN pnpm install --frozen-lockfile --filter @ledgerly/back...

FROM deps AS build
COPY apps/back apps/back
RUN pnpm --filter @ledgerly/back build

FROM build AS prune
RUN pnpm deploy --legacy --filter @ledgerly/back --prod /out

FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS runtime
WORKDIR /app
RUN apt-get update \
	&& apt-get install -y --no-install-recommends wget \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=prune /out/node_modules ./node_modules
COPY --from=build /app/apps/back/dist ./dist
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3000/api/health/ready || exit 1
CMD ["node", "dist/main.js"]
