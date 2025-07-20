<p align="center">
  <img src="logo.svg" width="560px" align="center" alt="NestJS + Zod logo" style="max-width: 100%;" />
  <h1 align="center">nestjs-zod</h1>
  <p align="center">
    ✨ A seamless validation solution for your NestJS application ✨
      <br/>
      by <a href="https://x.com/benlorantfy">@benlorantfy</a>
  </p>
</p>
<br/>
<p align="center">
  <a href="https://github.com/BenLorantfy/nestjs-zod/actions?query=branch%3Amain">
    <img src="https://github.com/BenLorantfy/nestjs-zod/actions/workflows/test-and-build.yml/badge.svg?event=push&branch=main" alt="nestjs-zod CI Status" />
  </a>
  <a href="https://opensource.org/licenses/MIT" rel="nofollow">
    <img src="https://img.shields.io/github/license/BenLorantfy/nestjs-zod" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/nestjs-zod" rel="nofollow">
    <img src="https://img.shields.io/npm/dw/nestjs-zod.svg" alt="npm">
  </a>
  <a href="https://www.npmjs.com/package/nestjs-zod" rel="nofollow">
    <img src="https://img.shields.io/github/stars/BenLorantfy/nestjs-zod" alt="stars">
  </a>
  <a href="https://x.com/benlorantfy">
    <img alt="X (formerly Twitter) Follow" src="https://img.shields.io/twitter/follow/benlorantfy">
  </a>
</p>

## Core library features

- `createZodDto` - create DTO classes from Zod schemas
- `ZodValidationPipe` - validate `body` / `query` / `params` using Zod DTOs
- `ZodValidationException` - BadRequestException extended with Zod errors
- OpenAPI support
  - `@nestjs/swagger` integration
  - Zod DTOs can be used in any `@nestjs/swagger` decorator
- Customization - change exception format easily

## Getting Started

1. Install the package:
    ```bash
    npm install nestjs-zod # Note: zod >= 3.25.0 is also required
    ```
2. Add `ZodValidationPipe` to the `AppModule`
    <details>
      <summary>
        Show me how
      </summary>

    `ZodValidationPipe` is required in order to validate the request body, query, and params

    ```diff
    + import { APP_PIPE } from '@nestjs/core';
    + import { ZodValidationPipe } from 'nestjs-zod';

    @Module({
      imports: [],
      controllers: [AppController],
      providers: [
    +    {
    +      provide: APP_PIPE,
    +      useClass: ZodValidationPipe,
    +    },
      ]
    })
    export class AppModule {}
    ```
    </details>

3. [OPTIONAL] Add `ZodSerializerInterceptor` to the `AppModule`
    <details>
      <summary>
        Show me how
      </summary>

    `ZodSerializerInterceptor` is required in order to validate the response bodies

    ```diff
    - import { APP_PIPE } from '@nestjs/core';
    + import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
    - import { ZodValidationPipe } from 'nestjs-zod';
    + import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';

    @Module({
      imports: [],
      controllers: [AppController],
      providers: [
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
        },
    +    {
    +      provide: APP_INTERCEPTOR,
    +      useClass: ZodSerializerInterceptor,
    +    },
      ]
    })
    export class AppModule {}
    ```
    </details>

4. [OPTIONAL] Add an `HttpExceptionFilter` 
    <details>
      <summary>
        Show me how
      </summary>

    An `HttpExceptionFilter` is required in order to add custom handling for zod errors

    ```diff
    - import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
    + import { APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
    import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
    + import { HttpExceptionFilter } from './http-exception.filter';

    @Module({
      imports: [],
      controllers: [AppController],
      providers: [
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ZodSerializerInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        }
      ]
    })
    export class AppModule {}

    + // http-exception.filter
    + @Catch(HttpException)
    + export class HttpExceptionFilter extends BaseExceptionFilter {
    +     private readonly logger = new Logger(HttpExceptionFilter.name);
    + 
    +     catch(exception: HttpException, host: ArgumentsHost) {
    +         if (exception instanceof ZodSerializationException) {
    +             const zodError = exception.getZodError();
    +             if (zodError instanceof ZodError) {
    +                 this.logger.error(`ZodSerializationException: ${zodError.message}`);
    +             }
    +         }
    + 
    +         super.catch(exception, host);
    +     }
    + }
    ```
    </details>


5. [OPTIONAL] Add `cleanupOpenApiDoc`

    > [!IMPORTANT]
    > This step is important if using `@nestjs/swagger`

    <details>
      <summary>
        Show me how
      </summary>

    `cleanupOpenApiDoc` is required if using `@nestjs/swagger` to properly post-process the OpenAPI doc

    ```diff
    - SwaggerModule.setup('api', app, openApiDoc);
    + SwaggerModule.setup('api', app, cleanupOpenApiDoc(openApiDoc));
    ```

    </details>

## Navigation

- [Creating DTO from Zod schema](#creating-dto-from-zod-schema)
  - [Using DTO](#using-dto)
- [Using ZodValidationPipe](#using-zodvalidationpipe)
  - [Globally](#globally-recommended)
  - [Locally](#locally)
  - [Creating custom validation pipe](#creating-custom-validation-pipe)
- [Using ZodGuard](#using-zodguard)
  - [Creating custom guard](#creating-custom-guard)
- [Validation Exceptions](#validation-exceptions)
- [Using ZodSerializerInterceptor](#using-zodserializerinterceptor-for-output-validation)
- [Extended Zod](#extended-zod)
  - [ZodDateString](#zoddatestring)
  - [ZodPassword](#zodpassword)
  - [Json Schema](#json-schema)
  - ["from" function](#from-function)
  - [Extended Zod Errors](#extended-zod-errors)
  - [Working with errors on the client side](#working-with-errors-on-the-client-side)
- [OpenAPI (Swagger) support](#openapi-swagger-support)
  - [Setup](#setup)
  - [Writing more Swagger-compatible schemas](#writing-more-swagger-compatible-schemas)
  - [Using zodToOpenAPI](#using-zodtoopenapi)

## Creating DTO from Zod schema

```ts
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const CredentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
})

// class is required for using DTO as a type
class CredentialsDto extends createZodDto(CredentialsSchema) {}
```

### Using DTO

DTO does two things:

- Provides a schema for `ZodValidationPipe`
- Provides a type from Zod schema for you

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
import { APP_PIPE } from '@nestjs/core'

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
class AuthController {}

class AuthController {
  // route-level
  @UsePipes(ZodValidationPipe)
  async signIn() {}
}
```

Also, you can instantly pass a Schema or DTO:

```ts
import { ZodValidationPipe } from 'nestjs-zod'
import { UserDto, UserSchema } from './auth.contracts'

// using schema
@UsePipes(new ZodValidationPipe(UserSchema))
// using DTO
@UsePipes(new ZodValidationPipe(UserDto))
class AuthController {}

class AuthController {
  // the same applies to route-level
  async signIn() {}
}
```

### Creating custom validation pipe

```ts
import { createZodValidationPipe } from 'nestjs-zod'

const MyZodValidationPipe = createZodValidationPipe({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) =>
    new BadRequestException('Ooops'),
})
```

## Using ZodGuard

> [!CAUTION]
> `ZodGuard` is deprecated and will not be supported soon.  It is recommended to use guards for authorization, not validation. See [MIGRATION.md](./MIGRATION.md) for more information.

Sometimes, we need to validate user input before specific Guards. We can't use Validation Pipe since NestJS Pipes are always executed after Guards.

The solution is `ZodGuard`. It works just like `ZodValidationPipe`, except for that is doesn't transform the input.

It has 2 syntax forms:

- `@UseGuards(new ZodGuard('body', CredentialsSchema))`
- `@UseZodGuard('body', CredentialsSchema)`

Parameters:

1. The source - `'body' | 'query' | 'params'`
2. Zod Schema or DTO (just like `ZodValidationPipe`)

When the data is invalid - it throws [ZodValidationException](#validation-exceptions).

```ts
import { ZodGuard } from 'nestjs-zod'

// controller-level
@UseZodGuard('body', CredentialsSchema)
@UseZodGuard('params', CredentialsDto)
class MyController {}

class MyController {
  // route-level
  @UseZodGuard('query', CredentialsSchema)
  @UseZodGuard('body', CredentialsDto)
  async signIn() {}
}
```

### Creating custom guard

> [!CAUTION]
> `createZodGuard` is deprecated and will not be supported soon.  It is recommended to use guards for authorization, not validation. See [MIGRATION.md](./MIGRATION.md) for more information.

```ts
import { createZodGuard } from 'nestjs-zod'

const MyZodGuard = createZodGuard({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) =>
    new BadRequestException('Ooops'),
})
```

## Create validation from scratch

> [!CAUTION]
> `validate` is deprecated and will not be supported soon.  It is recommended to use `.parse` directly. See [MIGRATION.md](./MIGRATION.md) for more information.

If you don't like `ZodGuard` and `ZodValidationPipe`, you can use `validate` function:

```ts
import { validate } from 'nestjs-zod'

validate(wrongThing, UserDto, (zodError) => new MyException(zodError)) // throws MyException

const validatedUser = validate(
  user,
  UserDto,
  (zodError) => new MyException(zodError)
) // returns typed value when succeed
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

## Using ZodSerializerInterceptor for output validation

To ensure that a response conforms to a certain shape, you may use the `ZodSerializerInterceptor` interceptor.

This would be especially useful in prevent accidental data leaks.

This is similar to NestJs' `@ClassSerializerInterceptor` feature [here](https://docs.nestjs.com/techniques/serialization)

### Include `@ZodSerializerInterceptor` in application root

```ts
@Module({
  ...
  providers: [
    ...,
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
```

### Use `@ZodSerializerDto` to define the shape of the response for endpoint in controller

```ts
const UserSchema = z.object({ username: string() })

export class UserDto extends createZodDto(UserSchema) {}
```

```ts
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ZodSerializerDto(UserDto)
  getUser(id: number) {
    return this.userService.findOne(id) // --> The native service method returns { username: string, password: string by default }
  }
}
```

In the above example, despite the `userService.findOne` method returns `password`, the `password` property will be stripped out thanks to the `@ZodSerializerDto` decorator.

### Logging serialization errors using `ZodSerializationException` 

You can catch serialization errors using `ZodSerializationException` and log them using your preferred logger.

```ts
if (exception instanceof ZodSerializationException) {
    const zodError = exception.getZodError();
    this.logger.error(`ZodSerializationException: ${zodError.message}`);
}
```
See the example app [here](/packages/example/src/http-exception.filter.ts) for more information.

## Extended Zod

> [!CAUTION]
> `@nest-zod/z` is no longer supported and has no impact on the OpenAPI generation.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

`@nest-zod/z` provides a special version of Zod. It helps you to validate the user input more accurately by using our custom schemas and methods.

### ZodDateString

> [!CAUTION]
> `@nest-zod/z` is no longer supported and has no impact on the OpenAPI generation.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

In HTTP, we always accept Dates as strings. But default Zod only has validations for full date-time strings. `ZodDateString` was created to address this issue.

```ts
// 1. Expect user input to be a "string" type
// 2. Expect user input to be a valid date (by using new Date)
z.dateString()

// Cast to Date instance
// (use it on end of the chain, but before "describe")
z.dateString().cast()

// Expect string in "full-date" format from RFC3339
z.dateString().format('date')

// [default format]
// Expect string in "date-time" format from RFC3339
z.dateString().format('date-time')

// Expect date to be the past
z.dateString().past()

// Expect date to be the future
z.dateString().future()

// Expect year to be greater or equal to 2000
z.dateString().minYear(2000)

// Expect year to be less or equal to 2025
z.dateString().maxYear(2025)

// Expect day to be a week day
z.dateString().weekDay()

// Expect year to be a weekend
z.dateString().weekend()
```

Valid `date` format examples:

- `2022-05-15`

Valid `date-time` format examples:

- `2022-05-02:08:33Z`
- `2022-05-02:08:33.000Z`
- `2022-05-02:08:33+00:00`
- `2022-05-02:08:33-00:00`
- `2022-05-02:08:33.000+00:00`

Errors:

- `invalid_date_string` - invalid date

- `invalid_date_string_format` - wrong format

  Payload:

  - `expected` - `'date' | 'date-time'`

- `invalid_date_string_direction` - not past/future

  Payload:

  - `expected` - `'past' | 'future'`

- `invalid_date_string_day` - not weekDay/weekend

  Payload:

  - `expected` - `'weekDay' | 'weekend'`

- `too_small` with `type === 'date_string_year'`
- `too_big` with `type === 'date_string_year'`

### ZodPassword

> [!CAUTION]
> `@nest-zod/z` is no longer supported and has no impact on the OpenAPI generation.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

`ZodPassword` is a string-like type, just like the `ZodDateString`. As you might have guessed, it's intended to help you with password schemas definition.

Also, `ZodPassword` has a more accurate OpenAPI conversion, comparing to regular `.string()`: it has `password` format and generated RegExp string for `pattern`.

```ts
// Expect user input to be a "string" type
z.password()

// Expect password length to be greater or equal to 8
z.password().min(8)

// Expect password length to be less or equal to 100
z.password().max(100)

// Expect password to have at least one digit
z.password().atLeastOne('digit')

// Expect password to have at least one lowercase letter
z.password().atLeastOne('lowercase')

// Expect password to have at least one uppercase letter
z.password().atLeastOne('uppercase')

// Expect password to have at least one special symbol
z.password().atLeastOne('special')
```

Errors:

- `invalid_password_no_digit`
- `invalid_password_no_lowercase`
- `invalid_password_no_uppercase`
- `invalid_password_no_special`
- `too_small` with `type === 'password'`
- `too_big` with `type === 'password'`

## OpenAPI (Swagger) support

> [!Note]
> There used to be a function called `patchNestJsSwagger`.  This function has been replaced by `cleanupOpenApiDoc`

If you have `@nestjs/swagger` setup, documentation will automatically be generated for:
- Request bodies, if you use `@Body() body: MyDto`
- Response bodies, if you use `@ApiOkResponse({ type: MyDto })`
- Query params, if you use `@Query() query: MyQueryParamsDto`

However, to complete the swagger integration, you need to call `cleanupOpenApiDoc` with the generated open api doc:

```diff
  const openApiDoc = SwaggerModule.createDocument(app, 
      new DocumentBuilder()
        .setTitle('Example API')
        .setDescription('Example API description')
        .setVersion('1.0')
        .build(),
  );
  - SwaggerModule.setup('api', app, openApiDoc);
  + SwaggerModule.setup('api', app, cleanupOpenApiDoc(openApiDoc));
```

For addtional documentation, follow the [Nest.js' Swagger Module Guide](https://docs.nestjs.com/openapi/introduction), or you can see the example application guide [here](/packages/example/) .

### Writing more Swagger-compatible schemas

Use `.describe()` method to add Swagger description:

```ts
import { z } from 'zod'

const CredentialsSchema = z.object({
  username: z.string().describe('This is an username'),
  password: z.string().describe('This is a password'),
})
```

### Using zodV3ToOpenAPI

> [!CAUTION]
> `zodV3ToOpenAPI` is deprecated and will not be supported soon, since zod v4 adds built-in support for generating OpenAPI schemas from zod scehams.  See [MIGRATION.md](./MIGRATION.md) for more information.

You can convert any Zod schema to an OpenAPI JSON object:

```ts
import { zodToOpenAPI } from 'nestjs-zod'
import { z } from 'zod'

const SignUpSchema = z.object({
  username: z.string().min(8).max(20),
  password: z.string().min(8).max(20),
  sex: z
    .enum(['male', 'female', 'nonbinary'])
    .describe('We respect your gender choice'),
  social: z.record(z.string().url())
})

const openapi = zodV3ToOpenAPI(SignUpSchema)
```

The output will be the following:

```json
{
  "type": "object",
  "properties": {
    "username": {
      "type": "string",
      "minLength": 8,
      "maxLength": 20
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "maxLength": 20
    },
    "sex": {
      "description": "We respect your gender choice",
      "type": "string",
      "enum": ["male", "female", "nonbinary"]
    },
    "social": {
      "type": "object",
      "additionalProperties": {
        "type": "string",
        "format": "uri"
      }
    },
    "birthDate": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["username", "password", "sex", "social", "birthDate"]
}
```

## Credits

This library was originally created by [risen228](https://github.com/risen228) and now maintained by [BenLorantfy](https://github.com/BenLorantfy/)
