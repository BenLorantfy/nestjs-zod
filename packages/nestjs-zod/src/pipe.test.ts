import { ArgumentMetadata } from '@nestjs/common'
import { createZodDto } from './dto'
import { ZodValidationException } from './exception'
import { ZodValidationPipe } from './pipe'

import * as z3 from 'zod/v3'
import * as z4 from 'zod/v4'

describe.each([
  { name: 'v4', z: z4 },
  { name: 'v3', z: z3 as unknown as typeof z4 },
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

  describe('with rejectNoSchema set to true', () => {
    it('should reject schemaless inputs', () => {
      const pipe = new ZodValidationPipe({ rejectNoSchema: true })

      const data = { someField: 'value' }
      expect(() =>
        pipe.transform(data, {
          type: 'query',
          // If an interface is provided as parameter type, then TypeScript will
          // emit an 'design:type' of Object.
          metatype: Object,
        })
      ).toThrow(ZodValidationException)
    })

    it.each([
      { ctor: String, name: 'string', value: 'test' },
      { ctor: Boolean, name: 'boolean', value: true },
      { ctor: Number, name: 'number', value: 123 },
      { ctor: BigInt, name: 'bigint', value: BigInt(123) },
    ])(
      'should allow primitive $name values for schemaless inputs',
      ({ ctor, value }) => {
        const pipe = new ZodValidationPipe({ rejectNoSchema: true })

        const result = pipe.transform(value, {
          type: 'body',
          metatype: ctor as any,
        })
        expect(result).toBe(value)
      }
    )
  })
})
