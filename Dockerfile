# syntax=docker/dockerfile:1
# base node image
FROM node:lts-alpine as base

# Install openssl for Prisma
RUN --mount=type=cache,id=apk,target=/var/cache/apk apk upgrade && apk add openssl libc6-compat
RUN --mount=type=cache,id=node,target=/root/.node corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV production
ENV CI 1
ARG PNPM=/root/.local/share/pnpm/store
WORKDIR /app

# Setup production node_modules 
FROM base as production-deps

COPY --link package.json pnpm-lock.yaml .
RUN --mount=type=cache,id=pnpm,target=$PNPM pnpm install

COPY --link prisma prisma
RUN --mount=type=cache,id=pnpm,target=$PNPM pnpx prisma generate

# Build the app
FROM production-deps as build

RUN --mount=type=cache,id=pnpm,target=$PNPM pnpm install --production=false

COPY --link . .
RUN --mount=type=cache,id=remix,target=.cache pnpm build

# Finally, build the production image with minimal footprint
FROM base

COPY --link --from=production-deps /app/node_modules node_modules
COPY --link --from=build /app/build build
COPY --link --from=build /app/public public
COPY --link . .

CMD "./start_with_migrations.sh"
