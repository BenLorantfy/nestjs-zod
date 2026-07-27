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

All steps are idempotent — re-running the CLI on an already-setup project is a no-op for the parts that are already in place.
