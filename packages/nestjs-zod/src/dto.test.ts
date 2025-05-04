import { createZodDto, markRequiredPropertiesAsRequired } from './dto'
import { z as actualZod } from 'zod'
import { z as nestjsZod } from '@nest-zod/z'

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('createZodDto (using %s)', (description, z) => {
  it('should correctly create DTO', () => {
    const UserSchema = z.object({
      username: z.string(),
      password: z.string(),
    })

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto.isZodDto).toBe(true)
    expect(UserDto.schema).toBe(UserSchema)

    const user = UserDto.create({
      username: 'vasya',
      password: 'strong',
    })

    expect(user).toEqual({
      username: 'vasya',
      password: 'strong',
    })
  })

  it('should generate correct OpenAPI metadata', () => {
    const UserSchema = z.object({
      username: z.string(),
      password: z.string(),
      nestedObject: z.object({
        nestedProperty: z.string(),
      }),
    })

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto._OPENAPI_METADATA_FACTORY()).toEqual({
      username: { type: 'string', required: true },
      password: { type: 'string', required: true },
      nestedObject: { 
        type: 'object', 
        selfRequired: true,
        required: ['nestedProperty'],
        properties: {
          nestedProperty: { type: 'string' },
        },
      },
    })
  })
});
