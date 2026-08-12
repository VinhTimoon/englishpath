FROM node:22-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json')); if (p.devEngines?.packageManager) p.devEngines.packageManager.version='11.13.1'; fs.writeFileSync('package.json', JSON.stringify(p));"
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
ARG NEXT_PUBLIC_SITE_URL=http://localhost:4173
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3005/api/v1
ARG NEXT_PUBLIC_AUTH_MODE=local
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_AUTH_MODE=$NEXT_PUBLIC_AUTH_MODE
RUN pnpm --filter web build

FROM node:22-bookworm-slim AS runtime

WORKDIR /workspace
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

COPY --from=build /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml /workspace/turbo.json ./
COPY --from=build /workspace/apps/web/package.json apps/web/package.json
COPY --from=build /workspace/apps/web/.next apps/web/.next
COPY --from=build /workspace/apps/web/public apps/web/public
COPY --from=build /workspace/node_modules node_modules
COPY --from=build /workspace/apps/web/node_modules apps/web/node_modules

EXPOSE 4173
CMD ["pnpm", "--dir", "apps/web", "start"]
