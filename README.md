# @entwico/nft-docker

CLI for shrinking Node.js Docker images. Traces what your entrypoint(s) actually import at runtime via [@vercel/nft](https://github.com/vercel/nft) and deletes the rest of `node_modules/`.

Designed to be run via `npx` inside a Dockerfile — not a project dependency.

## Commands

### `install`

Full Docker-build cycle: preinstall → install → prune.

```bash
npx @entwico/nft-docker install -e ./dist/server/entry.mjs
```

### `preinstall`

For pnpm projects only: ensures `.npmrc` has `node-linker=hoisted` (creates or appends as needed). No-op for npm/yarn.

```bash
npx @entwico/nft-docker preinstall
```

### `prune`

Trace + delete pass on an existing `node_modules/`.

```bash
npx @entwico/nft-docker prune -e ./dist/server/entry.mjs
```

## Flags

| Flag                               | Description                                                                                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-e <path>`, `--entrypoint <path>` | Entry to trace from. Repeat for multiple entrypoints (e.g. server + worker).                                                                                                                                     |
| `-p <glob>`, `--preserve <glob>`   | Extra files to keep regardless of trace output (fontsource woffs, locale JSONs, anything referenced via non-literal `import.meta.resolve()` or `require(varName)`). Repeatable. Patterns matching nothing throw. |
| `-r`, `--rewrite`                  | (Experimental) Rebundle entries with [rolldown](https://rolldown.rs/) before pruning. Much smaller images and faster cold starts.=                                                                               |
| `--no-minify`                      | (`--rewrite` only) Disable minification of the rewritten bundle. Default: on.                                                                                                                                    |
| `--no-sourcemap`                   | (`--rewrite` only) Skip emitting `.mjs.map` files. Default: on. With sourcemaps, run with `node --enable-source-maps` for symbolicated stack traces.                                                             |
| `-v`, `--verbose`                  | Verbose logs                                                                                                                                                                                                     |

## Dockerfile examples

### Build in CI, prune in Docker

```dockerfile
FROM node:24-alpine

RUN corepack enable pnpm
WORKDIR /srv
RUN addgroup -S app && adduser -S app -G app && apk add --no-cache tini

COPY package.json pnpm-lock.yaml /srv/
COPY dist/ /srv/dist/

RUN npx @entwico/nft-docker install -e ./dist/server/entry.mjs

USER app
ENTRYPOINT ["tini", "--", "node", "./dist/server/entry.mjs"]
```

### Install, build, and prune inside Docker

```dockerfile
FROM node:24-alpine AS builder

RUN corepack enable pnpm
WORKDIR /srv

COPY package.json pnpm-lock.yaml /srv/
RUN npx @entwico/nft-docker preinstall
RUN pnpm install --frozen-lockfile

COPY . /srv/
RUN pnpm run build

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

For npm projects, swap the lockfile and drop the corepack line.

### With `--preserve` for assets

```bash
npx @entwico/nft-docker install \
  -e ./dist/server/main.mjs \
  -p './node_modules/@fontsource/poppins/**' \
  -p './node_modules/some-i18n-pack/locales/*.json'
```

### With `--rewrite` for aggressive bundling

```bash
npx @entwico/nft-docker prune --rewrite \
  -e ./dist/server/entry.mjs \
  -e ./src/instrument.mjs

# run the resulting bundle with sourcemaps enabled:
node --enable-source-maps ./dist/server/entry.mjs
```

## License

MIT
