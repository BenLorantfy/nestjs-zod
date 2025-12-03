import { createZodDto } from './dto'
import * as z4 from 'zod/v4'
import * as z3 from 'zod/v3';
import * as zodMini from 'zod/v4-mini';
import { z as nestZod } from '@nest-zod/z';

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
    })
  })
})

describe('zod/v4', () => {
  it('allows creating an Output DTO from a schema', () => {
    const UserSchema = z4.object({
      username: z4.string(),
      password: z4.string(),
      myField: z4.string().optional().default('myField')
    })
  
    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto.Output._OPENAPI_METADATA_FACTORY()).toEqual({
      username: expect.objectContaining({ type: 'string', required: true }),
      password: expect.objectContaining({ type: 'string', required: true }),
      myField: expect.objectContaining({ type: 'string', required: true, default: 'myField' })
    })
  })

  it('should create nested defs', () => {
    const StatusEnum = z4.enum(['pending', 'completed', 'error']).meta({ id: 'Status' })

    const OrderSchema = z4.object({
      id: z4.uuid(),
      number: z4.number(),
      status: StatusEnum,
    }).meta({
      id: 'Order'
    });

    const OrdersResponseSchema = z4.object({
      orders: z4.array(OrderSchema),
    })

    class OrdersResponseDto extends createZodDto(OrdersResponseSchema) {}

    const metadata = OrdersResponseDto.Output._OPENAPI_METADATA_FACTORY() as any

    expect(metadata.orders['x-nestjs_zod-$defs'].Order_Output.properties.status.$ref).toEqual('#/$defs/Status_Output')
  });
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
