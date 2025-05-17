import { createZodDto } from './dto'
import * as z4 from 'zod/v4'
import * as z3 from 'zod/v3';

describe.each([
  { name: 'v4', z: z4 },
  { name: 'v3', z: z3 as unknown as typeof z4 }
])('$name', ({ z }) => {
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
})

describe('not zod', () => {
  it('works correctly for any schema that has a parse method', () => {
    const UserSchema = {
      parse: (input: unknown): { username: string, password: string } => {
        if(typeof input === 'object' && input !== null && 'username' in input && 'password' in input && typeof input.username === 'string' && typeof input.password === 'string') {
          return input as any;
        }

        throw new Error('Invalid input');
      },
    }

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
})
