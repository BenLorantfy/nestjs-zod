# nestjs-zod-cli

The official cli for `nestjs-zod`

Can be used to automatically setup and integrate `nestjs-zod` in a `nestjs` project

## Usage
```bash
nestjs-zod-cli /path/to/nestjs/project
```

## What it does

- Adds `ZodValidationPipe`, `ZodSerializerInterceptor`, and an `HttpExceptionFilter` to `app.module.ts`
- Optionally wires up `SwaggerModule` + `cleanupOpenApiDoc` in `main.ts`
- If swagger/OpenAPI generation is set up, creates a `specmatic.yaml` (declaring the `openapi.json` spec path, which your app is expected to already produce, and a `specmatic-examples` fixtures directory, which you populate yourself) and adds a `test:contract` npm script for [Specmatic](https://specmatic.io/) contract testing

All steps are idempotent — re-running the CLI on an already-setup project is a no-op for the parts that are already in place.
