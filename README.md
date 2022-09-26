# Welcome to Remix!

- [Remix Docs](https://remix.run/docs)

## Fly Setup

1. [Install `flyctl`](https://fly.io/docs/getting-started/installing-flyctl/)

2. Sign up and log in to Fly

```sh
flyctl auth signup
```

3. Setup Fly. It might ask if you want to deploy, say no since you haven't built the app yet.

```sh
flyctl launch
```

## Development

From your terminal:

```sh
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

If you've followed the setup instructions already, all you need to do is run this:

Run either one command to set the session secret environment variable

```sh
flyctl secrets set SESSION_SECRET="$(openssl rand -base64 33)"
flyctl secrets set SESSION_SECRET="$(head -c33 /dev/urandom | base64)"
```

```sh
npm run deploy
```

You can run `flyctl info` to get the url and ip address of your server.

Check out the [fly docs](https://fly.io/docs/getting-started/node/) for more information.

## Prisma

Sync schema changes to database during development

```sh
pnpm prisma db push
```

Create database migration

```sh
pnpm prisma migrate dev
```

Apply database migration on deployment

```sh
pnpm prisma migrate deploy
```
