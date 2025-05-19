import { createZodDto, registerZodDto } from './dto'
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

  const transformedSchema = z
    .object({
        seconds: z.number(),
    })
    .transform((value) => ({
        seconds: value.seconds,
        minutes: value.seconds / 60,
        hours: value.seconds / 3600,
    }))

  it('should serialize objects', () => {
    const schema = z.object({
      prop1: z.string(),
      prop2: z.string().optional(),
      prop3: z.number(),
      prop4: z.boolean(),
    })

    class SchemaDto extends createZodDto(schema) {}

    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      prop1: {
        type: 'string',
        required: true,
      },
      prop2: {
        type: 'string',
        required: false,
      },
      prop3: {
        type: 'number',
        required: true,
      },
      prop4: {
        type: 'boolean',
        required: true,
      }
    })
  })

  it('should serialize transformed schema', () => {  
    class SchemaDto extends createZodDto(transformedSchema) {}

    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      seconds: {
        type: 'number',
        required: true,
      },
    })
  })

  it('should serialize enums', () => {
    const schema = z.object({
      myEnum: z.enum(['adama', 'kota'])
    })

    class SchemaDto extends createZodDto(schema) {}
  
    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      myEnum: expect.objectContaining({
        enum: ['adama', 'kota'],
        required: true,
      }),
    })
  })

  it('should serialize native enums', () => {
    enum NativeEnum {
      ADAMA = 'adama',
      KOTA = 'kota',
    }
  
    const schema = z.object({
      myEnum: z.nativeEnum(NativeEnum)
    })   

    class SchemaDto extends createZodDto(schema) {}

    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      myEnum: expect.objectContaining({
        enum: ['adama', 'kota'],
        required: true,
      }),
    })
  })

  it('should serialize types with default value', () => {
    const schema = z.object({
      myStr: z.string().default('abitia')
    })   

    class SchemaDto extends createZodDto(schema) {}

    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      myStr: {
        type: 'string',
        default: 'abitia',
        required: false
      },
    })
  })

  it('should serialize optional types', () => {
    const schema = z.object({
      myStr: z.string().optional()
    })

    class SchemaDto extends createZodDto(schema) {}

    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      myStr: {
        type: 'string',
        required: false,
      },
    })
  })

  it('should serialize partial objects', () => {
    const schema = z
      .object({
        prop1: z.string(),
        prop2: z.string(),
      })
      .partial()

    class SchemaDto extends createZodDto(schema) {}
      
    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({
      prop1: {
        type: 'string',
        required: false,
      },
      prop2: {
        type: 'string',
        required: false,
      },
    });
  })

  it('should serialize lazy schema', () => {
    const schema = z.object({
      myLazy: z.lazy(() => z.string())
    })
    class SchemaDto extends createZodDto(schema) {}
    expect(SchemaDto._OPENAPI_METADATA_FACTORY()).toEqual({ 
      myLazy: {
        type: 'string',
        required: true,
      }
    })
  })



  if (z === z4) {
    it('should create reusable DTOs', () => {
      const Author = z.object({
        name: z.string(),
      }).meta({ id: 'Author' });
    
      class AuthorDto extends createZodDto(Author) {}

      registerZodDto(AuthorDto)

      const Post = z.object({
        title: z.string(),
        author: Author,
      });

      class PostDto extends createZodDto(Post) {}

      expect(PostDto._OPENAPI_METADATA_FACTORY()).toEqual({
        title: { type: 'string', required: true },
        author: { type: AuthorDto, required: true }
      });
    });

    it('should create reusable DTOs when nested', () => {
      const Author = z.object({
        name: z.string(),
      }).meta({ id: 'Author2' });
    
      class AuthorDto extends createZodDto(Author) {}

      registerZodDto(AuthorDto)

      const Post = z.object({
        title: z.string(),
        info: z.object({
          author: Author,
        }),
      });

      class PostDto extends createZodDto(Post) {}

      expect(PostDto._OPENAPI_METADATA_FACTORY()).toEqual({
        title: { type: 'string', required: true },
        info: { 
          type: 'object', 
          selfRequired: true, 
          required: ['author'],
          properties: {
            author: { type: AuthorDto }
          } 
        }
      });
    });

    it('should create reusable DTOs when in array', () => {
      const Author = z.object({
        name: z.string(),
      }).meta({ id: 'Author3' });
    
      class AuthorDto extends createZodDto(Author) {}

      registerZodDto(AuthorDto)

      const Post = z.object({
        title: z.string(),
        authors: z.array(Author),
      });

      class PostDto extends createZodDto(Post) {}

      expect(PostDto._OPENAPI_METADATA_FACTORY()).toEqual({
        title: { type: 'string', required: true },
        authors: { 
          type: 'array', 
          items: { type: AuthorDto },
          required: true,
        }
      });
    });
  }
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
