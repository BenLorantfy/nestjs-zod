import { createZodDto } from './dto'
import { z as actualZod } from 'zod'
import { z as nestjsZod } from '@nestjs-zod/z'

describe.each([
  ['zod', actualZod],
  ['@nestjs-zod/z', nestjsZod],
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
});

