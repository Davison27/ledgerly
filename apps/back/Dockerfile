FROM node:22-alpine AS base
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/back/package.json apps/back/package.json
COPY apps/front/package.json apps/front/package.json
RUN pnpm install --frozen-lockfile --filter @ledgerly/back...

FROM deps AS build
COPY apps/back apps/back
RUN pnpm --filter @ledgerly/back build

FROM build AS prune
RUN pnpm deploy --legacy --filter @ledgerly/back --prod /out

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=prune /out/node_modules ./node_modules
COPY --from=build /app/apps/back/dist ./dist
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
