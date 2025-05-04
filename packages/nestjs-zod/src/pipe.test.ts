import { ArgumentMetadata } from '@nestjs/common'
import { createZodDto } from './dto'
import { ZodValidationException } from './exception'
import { ZodValidationPipe } from './pipe'

import { z } from 'zod'

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