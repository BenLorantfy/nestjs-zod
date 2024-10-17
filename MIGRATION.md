# Migration

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
