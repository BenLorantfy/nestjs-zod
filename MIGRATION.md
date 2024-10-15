# Migration

## From version 3.x to 4.x

### `nestjs-zod/z` is now `@nestjs-zod/z`
The extended zod api was moved out of the main package to a separate package.  This requires a slight change to the import path:
```diff
- import { z } from 'nestjs-zod/z'
+ import { z } from '@nestjs-zod/z'
```
Additionally, `@nestjs-zod/z` is deprecated and will not be supported soon.  This is because the way `@nestjs-zod/z` extends `zod` is brittle and breaks in patch versions of zod.  If you still want to use the functionality of `password` and `dateString`, you can implement the same logic using [refine()](https://zod.dev/?id=refine)

> [!IMPORTANT]
> It is highly recommended to move towards importing `zod` directly, instead of `@nestjs-zod/z`

### `nestjs-zod/frontend` is removed
The same exports are now available in `@nestjs-zod/z/frontend` (see details about `@nestjs-zod/z` above).  This requires a slight change to the import path:
```diff
- import { isNestJsZodIssue } from 'nestjs-zod/frontend'
+ import { isNestJsZodIssue } from '@nestjs-zod/z/frontend'
```
`@nestjs-zod/z/frontend` is also deprecated and will not be supported soon, as explained above.
