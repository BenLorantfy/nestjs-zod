import { ArgumentMetadata } from '@nestjs/common'
import { createZodDto } from './dto'
import { ZodValidationException } from './exception'
import { ZodValidationPipe } from './pipe'

import * as z3 from 'zod/v3'
import * as z4 from 'zod/v4'

describe.each([
  { name: 'v4', z: z4 },
  { name: 'v3', z: z3 as unknown as typeof z4 }
])('$name', ({ z }) => {
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
