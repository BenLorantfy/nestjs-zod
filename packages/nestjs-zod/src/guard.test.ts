import { createMock } from '@golevelup/ts-jest'
import { ExecutionContext } from '@nestjs/common'
import { createZodDto } from './dto'
import { ZodValidationException } from './exception'
import { ZodGuard } from './guard'
import { Source } from './shared/types'

import { z as actualZod } from 'zod'
import { z as nestjsZod } from '@nest-zod/z'

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('ZodGuard (using %s)', (description, z) => {
  const UserSchema = z.object({
    username: z.string(),
    password: z.string(),
  })

  const UserDto = class Dto extends createZodDto(UserSchema) {}

  const contextMock = createMock<ExecutionContext>()

  function mockSource(source: Source, value: unknown) {
    contextMock.switchToHttp().getRequest.mockReturnValue({ [source]: value })
  }

  it('should work with any source and with Schema or DTO', () => {
    const sources: Source[] = ['body', 'params', 'query']

    for (const source of sources) {
      for (const schemaOrDto of [UserSchema, UserDto]) {
        const guard = new ZodGuard(source, schemaOrDto)

        const valid = {
          username: 'vasya',
          password: '123',
        }

        const invalid = {
          username: 'vasya',
          password: 123,
        }

        mockSource(source, valid)
        expect(guard.canActivate(contextMock)).toBe(true)

        mockSource(source, invalid)
        expect(() => guard.canActivate(contextMock)).toThrowError(
          ZodValidationException
        )
      }
    }
  })
})
