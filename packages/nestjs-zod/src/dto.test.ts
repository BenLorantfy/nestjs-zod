import { createZodDto } from './dto'
import * as z4 from 'zod/v4'
import * as z3 from 'zod/v3';
import * as zodMini from 'zod/v4-mini';
import { z as nestZod } from '@nest-zod/z';
import { PREFIX } from './const';

describe.each([
  { name: 'zod/v4', z: z4 },
  { name: 'zod/v3', z: z3 as unknown as typeof z4 }
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
      [PREFIX]: expect.objectContaining({
        type: 'object',
        required: [
          'username',
          'password',
          'nestedObject',
        ],
      })
    })
  })

  it('should generate correct OpenAPI metadata for non objects', () => {
    const UsersSchema = z.array(z.object({
      username: z.string(),
      password: z.string(),
    }))

    class UsersDto extends createZodDto(UsersSchema) {}

    expect(UsersDto._OPENAPI_METADATA_FACTORY()).toEqual({
      [PREFIX]: expect.objectContaining({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
          required: [
            'username',
            'password',
          ],
        },
      })
    })
  })
})

describe('zod/v4', () => {
  it('allows creating an Output DTO from a schema', () => {
    const AddressStatusEnum = z4.enum(['active', 'inactive']).meta({ id: 'AddressStatus' })

    const Address = z4.object({
      address: z4.string(),
      status: AddressStatusEnum
    }).meta({ id: 'Address' })

    const UserSchema = z4.object({
      username: z4.string(),
      password: z4.string(),
      myField: z4.string().optional().default('myField'),
      address: Address,
    }).meta({
      id: 'User',
      title: 'User',
    })

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto.Output._OPENAPI_METADATA_FACTORY()).toEqual({
      username: expect.objectContaining({ type: 'string', required: true }),
      password: expect.objectContaining({ type: 'string', required: true }),
      myField: expect.objectContaining({ type: 'string', required: true, default: 'myField' }),
      address: expect.objectContaining({ type: '', required: true, $ref: '#/$defs/Address_Output' }),
      [PREFIX]: {
        id: 'User_Output',
        title: 'User',
        type: 'object',
        additionalProperties: false,
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          myField: { type: 'string', default: 'myField' },
          address: {
            $ref: '#/$defs/Address_Output'
          }
        },
        required: [
          'username',
          'password',
          'myField',
          'address',
        ],
        $defs: {
          AddressStatus_Output: {
            type: 'string',
            id: 'AddressStatus_Output',
            enum: ['active', 'inactive'],
          },
          Address_Output: {
            type: 'object',
            id: 'Address_Output',
            additionalProperties: false,
            properties: {
              address: { type: 'string' },
              status: { $ref: '#/$defs/AddressStatus_Output' },
            },
            required: [
              'address',
              'status',
            ]
          }
        }
      }
    })
  })
})

describe('zod/v3', () => {
  it('throws error if trying to create an Output DTO from a zod v3 schema', () => {
    const UserSchema = z3.object({
      username: z3.string(),
      password: z3.string(),
      myField: z3.string().optional().default('myField')
    })

    class UserDto extends createZodDto(UserSchema) {}

    expect(() => UserDto.Output).toThrow('[nestjs-zod] Output DTOs can only be created from zod v4 schemas');
  })
})

describe.each([
  {
    name: 'zod/mini-v4',
    schema: zodMini.object({
      username: zodMini.string(),
      password: zodMini.string(),
    })
  },
  {
    name: '@nest-zod/z',
    schema: nestZod.object({
      username: nestZod.string(),
      password: nestZod.string(),
    })
  },
  {
     name: 'just a plain object with a parse method',
     schema: {
      parse: (input: unknown): { username: string, password: string } => {
        if(typeof input === 'object' && input !== null && 'username' in input && 'password' in input && typeof input.username === 'string' && typeof input.password === 'string') {
          return input as any;
        }

        throw new Error('Invalid input');
      },
    }
  }
])('$name', ({ schema }: { schema: { parse: (input: unknown) => { username: string, password: string } } }) => {
  it('parses correctly', () => {
    class UserDto extends createZodDto(schema) {}

    expect(UserDto.isZodDto).toBe(true)
    expect(UserDto.schema).toBe(schema)

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
