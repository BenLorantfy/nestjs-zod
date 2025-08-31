# Migration

## From version 4.x to 5.x
### [BREAKING] `patchNestJsSwagger` has been replaced with `cleanupOpenApiDoc`

`patchNestJsSwagger` was a brittle solution because it monkey-patched nestjs

This has been replaced with `cleanupOpenApiDoc`, which should be called with the generated OpenAPI doc before it is passed to `SwaggerModule.setup`

```diff
- patchNestJsSwagger()
- SwaggerModule.setup('api/zod-v3', app, openApiDoc);
+ SwaggerModule.setup('api/zod-v3', app, cleanupOpenApiDoc(openApiDoc));
```

### [BREAKING] `zodToOpenAPI` has been deprecated and renamed to `zodV3ToOpenAPI`
Any occurances of `zodToOpenAPI` should be changed to `zodV3ToOpenAPI`:

```diff
- const openApi = zodToOpenAPI(MySchema);
+ const openApi = zodV3ToOpenAPI(MySchema);
```

Also note [Zod v4](https://v4.zod.dev/v4#json-schema-conversion) introduces a built-in method of converting zod schemas to JSONSchema:

```ts
import * as z from "zod";
 
const mySchema = z.object({name: z.string(), points: z.number()});
 
z.toJSONSchema(mySchema);
// => {
//   type: "object",
//   properties: {
//     name: {type: "string"},
//     points: {type: "number"},
//   },
//   required: ["name", "points"],
// }
```

Because of this, `zodToOpenAPI` is no longer needed and has been deprecated.  It will be removed in a future version.

### [BREAKING] `getZodError` on `ZodValidationException` / `ZodSerializationException` returns `unknown` instead of `ZodError`

`nestjs-zod` v5 allows you to "bring your own zod", which includes zod v3, zod v4, and zod mini.  It can even work with validation libraries other than zod, as-long as there's a `parse` method on the schema.

This means `getZodError` may return many error types, depending on what version of zod you bring.

Because of this, it's been changed to return `unknown`.  The type of the zod error can be narrowed using `instanceof` checks, as shown below:

```ts
import { ZodError as ZodErrorV3 } from 'zod/v3';
import { ZodError as ZodErrorV4 } from 'zod/v4';

@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        if (exception instanceof ZodSerializationException) {
            const zodError = exception.getZodError();
            if (zodError instanceof ZodErrorV3) {
                this.logger.error(`ZodSerializationException: ${zodError.message}`);
            } else if (zodError instanceof ZodErrorV4) {
                this.logger.error(`ZodSerializationException: ${zodError.message}`);
            }
        }

        super.catch(exception, host);
    }
}
```

### [BREAKING] `z.password()` and `z.dateString()` from `@nest-zod/z` no longer have special handling in OpenAPI generation

The `@nest-zod/z` package has been deprecated since version `4.x`.  In `5.x`, `z.password()` and `z.dateString()` are no longer supported - specifically regarding the automatic swagger documentation generation

### [BREAKING] `ZodSerializerDto` unexpected array behavior fixed

In v4 of `nestjs-zod`, `ZodSerializerDto` had some odd behavior when an array was returned.  Let's take this example where we accidentally return an array instead of an object:

```ts
class BookDto extends createZodDto(z.object({ title: 'The Martian' })) { }

@ZodSerializerDto(BookDto)
getBook() {
    // Whoops, I'm returning an array instead of an object...
    return [{ title: 'The Martian' }];
}
```
In this case, even though we've unintentionally returned an array here, `nestjs-zod` would allow this.

This is because when you return an array, `nestjs-zod` v4 validates each item in the array against the provided schema

Consumers often found this behavior [surprising](https://github.com/BenLorantfy/nestjs-zod/issues/130#issuecomment-2733398629)

This has been changed in v5.  In v5, the example above will throw an error, as most consumers likely expect.  If you actually want to serialize an array, you can use `[]` syntax like this:
```diff
- @ZodSerializerDto(BookDto)
+ @ZodSerializerDto([BookDto])
```

Or you can make the DTO itself an array:
```diff
- class BookDto extends createZodDto(z.object({ title: 'The Martian' })) { }
+ class BookListDto extends createZodDto(z.object({ title: 'The Martian' }).array()) { }

// ...

- @ZodSerializerDto(BookDto)
+ @ZodSerializerDto(BookListDto)
```

### [BREAKING] Minimum zod version raised to `^3.25.0 || ^4.0.0`

Consumers need to upgrade `zod` to at-least `^3.25.0`

### Deprecated `createZodGuard`, `UseZodGuard`, and `ZodGuard`

`createZodGuard` and friends have been deprecated.  This was a mistake to add to the library, for a few reasons:
1. It clearly states in the nestjs documentation that guards are only meant for authorization, not for validation:

> Guards have a single responsibility. They determine whether a given request will be handled by the route handler or not, depending on certain conditions (like permissions, roles, ACLs, etc.) present at run-time. This is often referred to as authorization

2. `createZodGuard` uses `validate` which is also deprecated 
3. `createZodGuard` didn't do anything special.  You can create your own guard that does the same thing with very few lines of code.  However, it's recommended to use guards for authorization, not exclusively validation.  That's not to say you can't use zod inside a guard, but the main purpose of the guard should be authorization.

### Deprecated `validate`
`validate` was a redudant and confusingly named function (it should have been called `parse` if we wanted to keep it).  You can simply use the `.parse` function that is attached to the zod schema:

```ts
const MySchema = z.object(...);
const knownData = MySchema.parse(unknownData);
```

Or if you have a DTO:
```ts
class PostDto extends createZodDto(...) {}
const post = PostDto.schema.parse(...)
```
### OpenAPI generation
Note that the `nestjs-zod` OpenAPI generation for zod v4 schemas internally uses [`z.toJSONSchema`](https://zod.dev/json-schema) (with some minor tweaks in some cases) which is built into zod.

There are some differences between the built-in zod `JSONSchema` generation and nestjs-zod's old `JSONSchema` / `OpenAPI` generation:
1. Zod distinguishes between "input" and "output" `OpenAPI` schemas.  Each zod schema has an "input" `JSONSchema`, which represents the data shape required to pass validation, and an "output" `JSONSchema`, which represents the return value of parsing.  By default, DTOs created via `createZodDto` will generate the "input" `OpenAPI` schema.  To use the "output" version, you can use the `.Output` DTO property.  For example: `@ApiResponse({ type: Car.Output })`.  Alternatively, the "output" version is automatically used when using `@ZodResponse` (a new feature in nestjs-zod v5)
2. Zod defines some types as ["unrepresentable"](https://zod.dev/json-schema#unrepresentable), which means zod will throw an error if you try to generate a JSONSchema from them.  For example, `z.date()` is not representable in JSON (instead, you probably want to use `z.iso.date()` or `z.iso.datetime()` which validate `string`, not `Date`)

The new OpenAPI generation enables new features, such as differentiated input/output schemas, reusable named sub-schemas, recursive schemas, etc.  Check the `nestjs-zod` README.md and the [zod documentation](https://zod.dev/json-schema) itself for more information.


## From version 3.x to 4.x

### `nestjs-zod/z` is now `@nest-zod/z`
The extended zod api was moved out of the main package to a separate package.  This requires a slight change to the import path:
```diff
- import { z } from 'nestjs-zod/z'
+ import { z } from '@nest-zod/z'
```
Additionally, `@nest-zod/z` is deprecated and will not be supported soon.  This is because the way `@nest-zod/z` extends `zod` is brittle and breaks in patch versions of zod.  If you still want to use the functionality of `password` and `dateString`, you can implement the same logic using [refine()](https://zod.dev/?id=refine)

> [!CAUTION]
> It is highly recommended to move towards importing `zod` directly, instead of `@nest-zod/z`

### `nestjs-zod/frontend` is removed
The same exports are now available in `@nest-zod/z/frontend` (see details about `@nest-zod/z` above).  This requires a slight change to the import path:
```diff
- import { isNestJsZodIssue } from 'nestjs-zod/frontend'
+ import { isNestJsZodIssue } from '@nest-zod/z/frontend'
```
`@nest-zod/z/frontend` is also deprecated and will not be supported soon, as explained above.
