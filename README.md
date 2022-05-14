# nestjs-zod

Tired of integrating Zod into your NestJS application? Here is the solution!

## Core library features

- `createZodDto` - create DTO classes from Zod schemas
- `ZodValidationPipe` - validate `body` / `query` / `params` using Zod DTOs
- `ZodGuard` - guard routes by validating `body` / `query` / `params`  
  (it can be useful when you want to do that before other guards)
- `UseZodGuard` - alias for `@UseGuards(new ZodGuard(source, schema))`
- `ZodValidationException` - BadRequestException extended with Zod errors
- `zodToOpenAPI` - create OpenAPI declarations from Zod schemas
- `@nestjs/swagger` integration, but you need to apply patch
  - `nestjs-zod` generates highly accurate Swagger Schema
- `nz` - extended Zod schemas for NestJS (work in progress)
- Customization - you freely can replace `ZodValidationException`

## Installation

```
yarn add nestjs-zod
```

Included dependencies:
- `zod` -  `3.14.3`

Peer dependencies:
- `@nestjs/common` -  `^8.0.0`
- `@nestjs/core` -  `^8.0.0`
- `@nestjs/swagger` -  `^5.0.0` (optional)

## Writing Zod schemas

Extended Zod and Swagger integration are bound to the internal API, so even the patch updates can cause errors.

For that reason, `nestjs-zod` uses specific `zod` version inside and re-exports it as `nz`:

```ts
import { nz } from 'nestjs-zod'

const CredentialsSchema = nz.schema({
  username: nz.string(),
  password: nz.string(),
})
```

Zod's classes and types are re-exported too, but under `/nz` scope for more clarity:

```ts
import { ZodString, ZodError, ZodIssue } from 'nestjs-zod/nz' 
```

## Creating DTO from Zod schema

```ts
import { nz, createZodDto } from 'nestjs-zod'

const CredentialsSchema = nz.schema({
  username: nz.string(),
  password: nz.string(),
})

// class is required for using DTO as a type
class CredentialsDto extends createZodDto(CredentialsSchema) {}
```

### Using DTO

DTO does two things:
- Validates user input
- Provides you a type from Zod schema

```ts
@Controller('auth')
class AuthController {
  // with global ZodValidationPipe (recommended)
  async signIn(@Body() credentials: CredentialsDto) {}
  async signIn(@Param() signInParams: SignInParamsDto) {}
  async signIn(@Query() signInQuery: SignInQueryDto) {}

  // with route-level ZodValidationPipe
  @UsePipes(ZodValidationPipe)
  async signIn(@Body() credentials: CredentialsDto) {}
}

// with controller-level ZodValidationPipe
@UsePipes(ZodValidationPipe)
@Controller('auth')
class AuthController {
  async signIn(@Body() credentials: CredentialsDto) {}
}
```

## Using ZodValidationPipe

The validation pipe uses your Zod schema to parse data from parameter decorator.

When the data is invalid - it throws [ZodValidationException](#validation-exceptions).

### Globally (recommended)

```ts
import { ZodValidationPipe } from 'nestjs-zod'

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
```

### Locally

```ts
import { ZodValidationPipe } from 'nestjs-zod'

// controller-level
@UsePipes(ZodValidationPipe)
class MyController {}

class MyController {
  // route-level
  @UsePipes(ZodValidationPipe)
  async signIn() {}
}
```

### Creating custom validation pipe

```ts
import { createZodValidationPipe } from 'nestjs-zod'

const MyZodValidationPipe = createZodValidationPipe({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) => new BadRequestException('Ooops')
})
```

## Using ZodGuard

Sometimes, we need to validate user input before specific Guards. We can't use Validation Pipe since NestJS Pipes are always executed after Guards.

The solution is `ZodGuard`. It works just like `ZodValidationPipe`, except for that is doesn't transform the input.

It has 2 syntax forms:
- `@UseGuards(new ZodGuard('body', CredentialsSchema))`
- `@UseZodGuard('body', CredentialsSchema)`

The first parameter is `Source`: `'body' | 'query' | 'params'`

When the data is invalid - it throws [ZodValidationException](#validation-exceptions).

```ts
import { ZodGuard } from 'nestjs-zod'

// controller-level
@UseZodGuard('body', CredentialsSchema)
class MyController {}

class MyController {
  // route-level
  @UseZodGuard('body', CredentialsSchema)
  async signIn() {}
}
```

### Creating custom guard

```ts
import { createZodGuard } from 'nestjs-zod'

const MyZodGuard = createZodGuard({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) => new BadRequestException('Ooops')
})
```

## Validation Exceptions

The default server response on validation error looks like that:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "inclusive": true,
      "message": "String must contain at least 8 character(s)",
      "path": ["password"]
    }
  ]
}
```

The reason of this structure is default `ZodValidationException`.

You can customize the exception by creating custom `nestjs-zod` entities using the factories:
- [Validation Pipe](#creating-custom-validation-pipe)
- [Guard](#creating-custom-guard)

You can create `ZodValidationException` manually by providing `ZodError`:

```ts
const exception = new ZodValidationException(error)
```

Also, `ZodValidationException` has an additional API for better usage in NestJS Exception Filters:

```ts
@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException) {
    exception.getZodError() // -> ZodError
  }
}
```

## OpenAPI (Swagger) support

### Setup

Prerequisites:
- `@nestjs/swagger` with version `^5.0.0` installed

Apply a patch:

```ts
import { patchNestjsSwagger } from 'nestjs-zod'

patchNestjsSwagger()
```

Then follow the [Nest.js' Swagger Module Guide](https://docs.nestjs.com/openapi/introduction).

### Schemas-writing advices

Use `.describe()` method to add Swagger description:

```ts
import { nz } from 'nestjs-zod'

const CredentialsSchema = nz.schema({
  username: nz.string().describe('This is an username'),
  password: nz.string().describe('This is a password'),
})
```