# nestjs-zod example

This is an example nestjs app that shows how to integrate with nestjs-zod

## Setup example
- Example showing how to setup `ZodValidationPipe` and `ZodSerializerInterceptor`: [app.module.ts](./src/app.module.ts)
- Example showing how to integrate `cleanupOpenApiDoc`: [main.ts](./src/main.ts)
- Example showing how to implement custom zod error handling: [http-exception.filter.ts](./src/http-exception.filter.ts)

## Usage examples
- Examples defining DTOs: [people.dto.ts](./src/people/people.dto.ts) and [starships.dto.ts](./src/starships/starships.dto.ts)
- Examples showing how to use DTOs: [people.controller.ts](./src/people/people.controller.ts) and [starships.controller.ts](./src/starships/starships.controller.ts)
  - Example showing how to use zod to validate query params can be found in the `getPeople` method
- Example showing how to use `codecs`: [people.dto.ts](./src/people/people.dto.ts)