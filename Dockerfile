# syntax=docker/dockerfile:1
# base node image
FROM node:lts-alpine as base

# Install openssl for Prisma
RUN --mount=type=cache,id=apk,target=/var/cache/apk apk upgrade && apk add openssl libc6-compat
RUN --mount=type=cache,id=node,target=/root/.node corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV production
ENV CI 1
ARG PNPM=/root/.local/share/pnpm/store

# Setup production node_modules 
FROM base as production-deps

RUN mkdir /app
WORKDIR /app

COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=$PNPM pnpm install

COPY --link prisma ./
RUN --mount=type=cache,id=pnpm,target=$PNPM pnpx prisma generate

# Build the app
FROM production-deps as build

RUN --mount=type=cache,id=pnpm,target=$PNPM pnpm install --production=false

COPY --link . .
RUN pnpm build

# Finally, build the production image with minimal footprint
FROM base

RUN mkdir /app
WORKDIR /app

COPY --link --from=production-deps /app/node_modules /app/node_modules
COPY --link --from=build /app/build /app/build
COPY --link --from=build /app/public /app/public
COPY --link . .

CMD "./start_with_migrations.sh"
