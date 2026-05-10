## [1.0.1](https://github.com/entwico/nft-docker/compare/v1.0.0...v1.0.1) (2026-03-20)

## 1.3.0

### Minor Changes

- 7d3963d: remove the preinstall command; install now passes --node-linker=hoisted to pnpm directly

## 1.2.0

### Minor Changes

- 8fc8bef: add pnpm 11 support

## 1.1.2

### Patch Changes

- fix `--rewrite` crashing on packages that shadow node builtins (e.g. `punycode`)

## 1.1.1

### Patch Changes

- fix `MODULE_NOT_FOUND` at runtime for some packages under `--rewrite`

## 1.1.0

### Minor Changes

- f0f5a1b: new `-p` / `--preserve` flag for declaring extra files NFT cannot statically resolve (e.g. fontsource woffs, locale JSON files)
- f0f5a1b: new experimental `--rewrite` flag that rebundles entries with rolldown before NFT trims, producing significantly smaller production images

### Bug Fixes

- updated deps ([869985a](https://github.com/entwico/nft-docker/commit/869985a61b26523f73a34be6435fa718222ddfc8))
