# @entwico/nft-docker

A CLI tool for optimizing Node.js Docker images using [@vercel/nft](https://github.com/vercel/nft) (Node File Trace). It traces your application's entrypoint(s) to determine exactly which files under `node_modules/` are actually needed at runtime, then deletes everything else — resulting in significantly smaller Docker images.

Intended to be used via `npx` inside Dockerfiles — it is NOT a project dependency.

## Why

- **Many frameworks** (e.g. Astro) list build-time dependencies (Vite, esbuild, etc.) alongside runtime dependencies. `pnpm deploy --prod` or `npm prune --production` cannot distinguish build-only imports from runtime imports. NFT traces actual runtime file usage, producing much smaller output.
- **pnpm compatibility**: pnpm's default symlinked `node_modules` layout breaks naive file-copy pruning. This tool handles the workaround automatically.

## CLI commands

### `npx @entwico/nft-docker install -e <entrypoint> [...]`

All-in-one command for Docker builds. Runs the full cycle: preinstall, dependency installation, and pruning.

1. Patches `.npmrc` with `node-linker=hoisted` if the project uses pnpm.
2. Runs the appropriate frozen install command (`pnpm install --frozen-lockfile` / `npm ci` / `yarn install --frozen-lockfile`).
3. Traces the given entrypoint(s) with `@vercel/nft` and removes all non-traced files from `node_modules/`.

### `npx @entwico/nft-docker preinstall`

Prepares the environment for a compatible `node_modules` layout before installing dependencies.

- Detects the package manager from `packageManager` field in `package.json`, falling back to lockfile detection.
- If pnpm: ensures `.npmrc` has `node-linker=hoisted` (creates or appends as needed).
- If npm or yarn: no-op.

### `npx @entwico/nft-docker prune -e <entrypoint> [...]`

Traces entrypoint(s) and removes all non-traced files from `node_modules/`.

- Runs `nodeFileTrace()` on the given entrypoint(s).
- Deletes every file in `node_modules/` that is NOT in the traced set (single pass, in place).
- Removes empty directories left behind.

## Dockerfile usage

### Simple: build in CI, prune in Docker

If your app is already built before the Docker build (e.g. in a CI step), you only need to prune:

```dockerfile
FROM node:24-alpine

# enable corepack for pnpm (skip if using npm)
RUN corepack enable pnpm

WORKDIR /srv

RUN addgroup -S app && adduser -S app -G app && apk add --no-cache tini

COPY package.json pnpm-lock.yaml /srv/
COPY dist/ /srv/dist/

RUN npx @entwico/nft-docker install -e ./dist/server/entry.mjs

USER app
ENTRYPOINT ["tini", "--", "node", "./dist/server/entry.mjs"]
```

### Full: install, build, and prune inside Docker

When the Docker build handles everything, use the individual commands so the build step runs between install and prune:

```dockerfile
FROM node:24-alpine AS builder

# enable corepack for pnpm (skip if using npm)
RUN corepack enable pnpm

WORKDIR /srv

# install dependencies with hoisted node_modules
COPY package.json pnpm-lock.yaml /srv/
RUN npx @entwico/nft-docker preinstall
RUN pnpm install --frozen-lockfile

# build
COPY . /srv/
RUN pnpm run build

# prune node_modules to runtime-only files
RUN npx @entwico/nft-docker prune -e ./dist/server/entry.mjs

# --- final image ---
FROM node:24-alpine

WORKDIR /srv

RUN addgroup -S app && adduser -S app -G app && apk add --no-cache tini

COPY --from=builder --chown=app:app /srv/node_modules /srv/node_modules/
COPY --from=builder --chown=app:app /srv/dist /srv/dist/

USER app
ENTRYPOINT ["tini", "--", "node", "./dist/server/entry.mjs"]
```

For npm-based projects, replace the lockfile and drop the corepack line — everything else stays the same.

## Multiple entrypoints

If your app has multiple entrypoints (e.g., a server and a worker), pass them all:

```bash
npx @entwico/nft-docker install -e ./dist/server/entry.mjs -e ./dist/worker/index.mjs
```

NFT merges the trace results, keeping files needed by any entrypoint.

## License

MIT
