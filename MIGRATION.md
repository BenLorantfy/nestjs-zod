# Migration

## From version 4.x to 5.x
### `patchNestJsSwagger` has been removed
There is no need to call `patchNestJsSwagger` anymore.  The call to `patchNestJsSwagger` can simply be removed:
```diff
- patchNestJsSwagger()
```

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

### Deprecated `zodToOpenAPI`
[Zod v4](https://v4.zod.dev/v4#json-schema-conversion) introduces a built-in method of converting zod schemas to OpenAPI, so this function is no longer needed.

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

### `getZodError` on `ZodValidationException` / `ZodSerializationException` returns `unknown` instead of `ZodError`

In order to support both zod v3 and zod v4, which have different error classes, `getZodError` was changed to return `unknown`.  This means you'll have to use an `instanceof` check after calling `getZodError()`

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
### `z.password()` and `z.dateString()` from `@nest-zod/z` are no longer supported

The `@nest-zod/z` package has been deprecated since version 4.x.  In 5.x `z.password()` and `z.dateString()` are no longer supported, specifically regarding the automatic swagger documentation generation

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
