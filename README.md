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

    > **Important**: This step is important if using `@nestjs/swagger`

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

Check out the [example app](./packages/example/) for a full example of how to integrate nestjs-zod in your nestjs application

## Documentation

- [Request Validation](#request-validation)
  - [`createZodDto` (Create a DTO from a Zod schema)](#createzoddto-create-a-dto-from-a-zod-schema)
  - [`ZodValidationPipe` (Get nestjs to validate using zod)](#zodvalidationpipe-get-nestjs-to-validate-using-zod)
  - [`createZodValidationPipe` (Creating custom validation pipe)](#createzodvalidationpipe-creating-custom-validation-pipe)
  - [`ZodValidationException`](#zodvalidationexception)
- [Response Validation](#response-validation)  
  - [`ZodSerializerDto` (Set zod DTO to serialize responses with)](#zodserializerdto-set-zod-dto-to-serialize-responses-with)
  - [`ZodSerializerInterceptor` (Get nestjs to serialize responses with zod)](#zodserializerinterceptor-get-nestjs-to-serialize-responses-with-zod)
  - [`ZodResponse` (Ensure correct responses at run-time, compile-time, and documentation-time)](#zodresponse)
  - [`ZodSerializationException`](#zodserializationexception)
- [OpenAPI (Swagger) support](#openapi-swagger-support)
  - [`cleanupOpenApiDoc` (Ensure proper OpenAPI output)](#cleanupopenapidoc-ensure-proper-openapi-output)
  - [Writing more Swagger-compatible schemas](#writing-more-swagger-compatible-schemas)
  - [`zodV3ToOpenAPI` (⚠️ DEPRECATED)](#zodv3toopenapi-deprecated)
- [`validate` (⚠️ DEPRECATED)](#validate-deprecated)
- [`ZodGuard` (⚠️ DEPRECATED)](#zodguard-deprecated)
  - [`createZodGuard` (Creating custom guard)](#createzodguard-creating-custom-guard)
- [`@nest-zod/z` (⚠️ DEPRECATED)](#nest-zodz-deprecated)
  - [ZodDateString](#zoddatestring)
  - [ZodPassword](#zodpassword)

### Request Validation
#### `createZodDto` (Create a DTO from a Zod schema)

`createZodDto` is used to create a nestjs DTO from a zod schema.  Then these DTOs can be used instead of DTOs created with `class-validator` / `class-transformer`.

See an example below of how to create a zod DTO:

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

> [!NOTE]
> We need to use the `class <dtoname> extends createZodDto(...` syntax because nestjs/typescript requires classes be used for DTOs

##### Using Zod DTOs

Zod DTOs are responsible for three things:

1. Providing a schema for `ZodValidationPipe` to validate incoming client data against
2. Providing a compile-time typescript type from the Zod schema
3. Providing an OpenAPI schema when using `nestjs/swagger`

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

#### `ZodValidationPipe` (Get nestjs to validate using zod)

The validation pipe uses your Zod schema to parse data incoming client data when using `@Body()`, `@Params()`, or `@Query()` parameter deccorators

When the data is invalid it throws a [ZodValidationException](#zodvalidationexception).

##### Globally (recommended)

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

##### Locally

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

#### `createZodValidationPipe` (Creating custom validation pipe)

You can also create a custom validation pipe if desired:

```ts
import { createZodValidationPipe } from 'nestjs-zod'

const MyZodValidationPipe = createZodValidationPipe({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) =>
    new BadRequestException('Ooops'),
})
```

#### `ZodValidationException`

If the zod request parsing fails, then `nestjs-zod` will throw a `ZodValidationException`, which will result in the following HTTP response:

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

You can customize the exception and HTTP response by either `1)` creating a custom validation pipe using [`createZodValidationPipe`](#createzodvalidationpipe-creating-custom-validation-pipe) or `2)` handling `ZodValidationException` inside an [exception filter](https://docs.nestjs.com/exception-filters)

Here is an example exception filter:

```ts
@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException) {
    exception.getZodError() // -> ZodError
  }
}
```

### Response Validation

#### `ZodSerializerDto` (Set zod DTO to serialize responses with)

To ensure that a response conforms to a certain shape, you can use the `ZodSerializerDto` method decorator (ensure `ZodSerializerInterceptor` is setup correctly as detailed in the below section)

This is especially useful to prevent accidental data leaks.

```ts
const UserSchema = z.object({ username: string() })

class UserDto extends createZodDto(UserSchema) {}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ZodSerializerDto(UserDto)
  getUser(id: number) {
    return this.userService.findOne(id)
  }
}
```

In the above example, if the `userService.findOne` method returns `password`, the `password` property will be stripped out thanks to the `@ZodSerializerDto` decorator.


#### `ZodSerializerInterceptor` (Get nestjs to serialize responses with zod)

To ensure `ZodSerializerDto` works correctly, `ZodSerializerInterceptor` needs to be used and setup correctly.  This should be done in the `AppModule` like so:

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

Also see [`ZodSerializationException`](#zodserializationexception) for information about customizing the serialization error handling

#### `ZodResponse`

TODO: add docs for `ZodResponse` here

#### `ZodSerializationException`

If the zod response serialization fails, then `nestjs-zod` will throw a `ZodSerializationException`, which will result in the following HTTP response:

```json
{
  "message": 'Internal Server Error',
  "statusCode": 500,
}
```

You can customize the exception and HTTP response handling `ZodSerializationException` inside an [exception filter](https://docs.nestjs.com/exception-filters)

See the example app [here](/packages/example/src/http-exception.filter.ts) for more information.

### OpenAPI (Swagger) support

> [!Note]
> There used to be a function called `patchNestJsSwagger`.  This function has been replaced by `cleanupOpenApiDoc`

If you have `@nestjs/swagger` setup, documentation will automatically be generated for:
- Request bodies, if you use `@Body() body: MyDto`
- Response bodies, if you use `@ApiOkResponse({ type: MyDto })` (or `@ZodResponse({ type: MyDto })`)
- Query params, if you use `@Query() query: MyQueryParamsDto`

However, `cleanupOpenApiDoc` needs to be called as detailed below:

#### `cleanupOpenApiDoc` (Ensure proper OpenAPI output)

To complete the swagger integration/setup, you need to call `cleanupOpenApiDoc` with the generated open api doc:

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

For addtional documentation, follow the [Nest.js' Swagger Module Guide](https://docs.nestjs.com/openapi/introduction), or you can see the example application [here](/packages/example/) .

#### Writing more Swagger-compatible schemas

Use `.describe()` method to add Swagger description:

```ts
import { z } from 'zod'

const CredentialsSchema = z.object({
  username: z.string().describe('This is an username'),
  password: z.string().describe('This is a password'),
})
```

#### `zodV3ToOpenAPI` _**(DEPRECATED)**_

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

### `ZodGuard` _**(DEPRECATED)**_

> [!CAUTION]
> Guard-related functions are deprecated and will not be supported soon.  It is recommended to use guards for authorization, not validation. See [MIGRATION.md](./MIGRATION.md) for more information.

<details>
  <summary>
    Show documentation for deprecated APIs
  </summary>

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

  #### `createZodGuard` (Creating custom guard)

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

</details>

### `validate` _**(DEPRECATED)**_

> [!CAUTION]
> `validate` is deprecated and will not be supported soon.  It is recommended to use `.parse` directly. See [MIGRATION.md](./MIGRATION.md) for more information.

<details>
  <summary>
    Show documentation for deprecated APIs
  </summary>

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

</details>

### `@nest-zod/z` _**(DEPRECATED)**_

> [!CAUTION]
> `@nest-zod/z` is no longer supported and has no impact on the OpenAPI generation.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

<details>
  <summary>
    Show documentation for deprecated package
  </summary>


  `@nest-zod/z` provides a special version of Zod. It helps you to validate the user input more accurately by using our custom schemas and methods.

  #### ZodDateString

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

  #### ZodPassword

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

</details>

## Credits

This library was originally created by [risen228](https://github.com/risen228) and now maintained by [BenLorantfy](https://github.com/BenLorantfy/)
