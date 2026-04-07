# AGENTS.md

## Cursor Cloud specific instructions

### Overview
This is a pnpm monorepo (`pnpm-workspace.yaml`) for the `nestjs-zod` library ecosystem. No databases, Docker, or external services are required — everything runs in-memory.

### Build order (critical)
`@nest-zod/z` must be built **before** `nestjs-zod` tests or builds, since `nestjs-zod` depends on it via `workspace:*`:
1. `cd packages/z && pnpm build`
2. `cd packages/nestjs-zod && pnpm test` / `pnpm build`

### Key commands
All commands are in each package's `package.json` scripts. The important ones:

| Package | Test | Build | Lint |
|---|---|---|---|
| `packages/z` | `pnpm test` (Jest) | `pnpm build` (rollup) | — |
| `packages/nestjs-zod` | `pnpm test` (Jest) | `pnpm build` (tsdown) | `pnpm lint` (ESLint), `pnpm format:check` (Prettier) |
| `packages/example` | `pnpm test` (Jest) | `pnpm build` (nest build) | — |
| `packages/example-dual-zods` | `pnpm test` (Jest) | `pnpm build` (nest build) | — |
| `packages/example-esm` | — | `pnpm build` (nest build + SWC) | — |

### Running the example app
The example Star Wars app listens on port **3001** (not 3000). After building:
```
cd packages/example && pnpm build && node dist/main.js
```
Swagger UI is available at `http://localhost:3001/api`.

### pnpm v10 build approval
The root `package.json` includes `pnpm.onlyBuiltDependencies` to allow `@nestjs/core`, `@scarf/scarf`, `@swc/core`, and `esbuild` postinstall scripts. This avoids the interactive `pnpm approve-builds` prompt.

### Playwright tests (optional)
The example apps have Playwright-based Swagger tests (`pnpm run test:swagger`). These require `pnpm exec playwright install --with-deps` first.
