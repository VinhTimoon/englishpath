FROM node:22-bookworm-slim AS build

WORKDIR /workspace
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json')); if (p.devEngines?.packageManager) p.devEngines.packageManager.version='11.13.1'; fs.writeFileSync('package.json', JSON.stringify(p));"
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/englishpath
RUN pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter api build

FROM node:22-bookworm-slim AS runtime

WORKDIR /workspace
ENV NODE_ENV=development
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

COPY --from=build /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml /workspace/turbo.json ./
COPY --from=build /workspace/apps/api/package.json apps/api/package.json
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/prisma apps/api/prisma
COPY --from=build /workspace/apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY --from=build /workspace/apps/api/src/generated apps/api/src/generated
COPY --from=build /workspace/node_modules node_modules
COPY --from=build /workspace/apps/api/node_modules apps/api/node_modules

EXPOSE 3005
CMD ["sh", "-c", "pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma && node apps/api/dist/src/main.js"]
