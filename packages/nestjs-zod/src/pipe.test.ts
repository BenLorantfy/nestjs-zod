import { ArgumentMetadata } from '@nestjs/common'
import { createZodDto } from './dto'
import { ZodValidationException } from './exception'
import { ZodValidationPipe } from './pipe'

import { z as actualZod } from 'zod'
import { z as nestjsZod } from '@nest-zod/z'

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('ZodValidationPipe (using %s)', (description, z) => {
  const UserSchema = z.object({
    username: z.string(),
    password: z.string(),
  })

  const UserDto = class Dto extends createZodDto(UserSchema) {}

  it('should use manually passed Schema / DTO for validation', () => {
    for (const schemaOrDto of [UserSchema, UserDto]) {
      const pipe = new ZodValidationPipe(schemaOrDto)

      const valid = {
        username: 'vasya',
        password: '123',
      }

      const invalid = {
        username: 'vasya',
        password: 123,
      }

      const metadata: ArgumentMetadata = {
        type: 'body',
      }

      expect(pipe.transform(valid, metadata)).toEqual(valid)
      expect(() => pipe.transform(invalid, metadata)).toThrowError()
    }
  })

  it('should use contextual Dto for validation', () => {
    const pipe = new ZodValidationPipe()

    const valid = {
      username: 'vasya',
      password: '123',
    }

    const invalid = {
      username: 'vasya',
      password: 123,
    }

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: class Dto extends createZodDto(UserSchema) {},
    }

    expect(pipe.transform(valid, metadata)).toEqual(valid)
    expect(() => pipe.transform(invalid, metadata)).toThrowError(
      ZodValidationException
    )
  })
})
