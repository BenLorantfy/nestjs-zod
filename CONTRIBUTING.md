# Contributing

When it comes to open source, there are different ways you can contribute, all
of which are valuable. Here's few guidelines that should help you as you prepare
your contribution.

## When reporting a bug, create a test

When you report a bug, it's helpful to include in the description a failing test that you expect to pass

Alternatively, you can provide a GitHub repository with a minimal reproduction

## Create a GitHub issue before creating a PR

Please create a GitHub issue before creating a PR.  This gives us a chance to discuss wether the change is needed and discuss the approach.

## Creating a PR

The following steps will get you setup to contribute changes to this repo:

1. Fork this repo.

2. Clone your forked repo: `git clone git@github.com:{your_username}/nestjs-zod.git`

3. Run `pnpm i` to install dependencies.

### Directory structure

This repository is a monorepo and includes several packages under the `packages` directory:
1. `cli` - This is a command line utility that can be used to automatically setup `nestjs-zod`
2. `example` - A basic example of using `nestjs-zod`
3. `example-dual-zod` - An example that uses both `zod` v4 and v3
4. `nestjs-zod` - The main package
5. `z` - Deprecated package that should not need any changes

### Tests

Please write tests for any PR you create

`packages/example` is additionally covered by [Specmatic](https://specmatic.io/) contract tests. CI starts the app for real and runs `specmatic test`, which fetches the OpenAPI spec live from the running app's `/openapi.json` endpoint (see `packages/example/specmatic.yaml`) and replays the fixtures in `packages/example/specmatic-examples/*.json` against it, asserting real responses match what's documented — plus, since `schemaResiliencyTests` is enabled, its own generated mutated request variants per operation. If you change a request/response shape in `packages/example`, update the corresponding DTO and `@ApiResponse` decorators so the live spec still matches, and update/add a matching fixture in `specmatic-examples/` if the change affects one of the hand-picked example scenarios. See [`SPECMATIC.md`](./SPECMATIC.md) for the full mechanism.

### Documentation

The `nestjs-zod` documentation lives in the README.md. Be sure to document any API changes you implement.

## License

By contributing your code to the `nestjs-zod` GitHub repository, you agree to
license your contribution under the MIT license.