import * as z4 from 'zod/v4';
import * as z3 from 'zod/v3';
import { toSwagger } from './to-swagger';

describe.each([
    { name: 'v4', z: z4 },
    { name: 'v3', z: z3 as unknown as typeof z4 }
  ])('$name', ({ z }) => {
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
      })
  
      expect(toSwagger(schema)).toEqual({
        type: 'object',
        required: ['prop1'],
        properties: {
          prop1: {
            type: 'string',
          },
          prop2: {
            type: 'string',
          },
        },
      })
    })
  
    it('should serialize transformed schema', () => {  
      expect(toSwagger(transformedSchema)).toEqual({
        type: 'object',
        required: ['seconds'],
        properties: {
          seconds: {
            type: 'number',
          },
        },
      })
    })
  
    it('should serialize enums', () => {
      const schema = z.enum(['adama', 'kota'])
    
      expect(toSwagger(schema)).toEqual(expect.objectContaining({
        enum: ['adama', 'kota'],
      }))
    })

    it('should serialize native enums', () => {
      enum NativeEnum {
        ADAMA = 'adama',
        KOTA = 'kota',
      }
    
      const schema = z.nativeEnum(NativeEnum)    
      expect(toSwagger(schema)).toEqual(expect.objectContaining({
        enum: ['adama', 'kota']
      }))
    })

    it('should serialize types with default value', () => {
      const schema = z.string().default('abitia')    
      expect(toSwagger(schema)).toEqual({ type: 'string', default: 'abitia' })
    })

    it('should serialize optional types', () => {
      const schema = z.string().optional()
      const openApiObject = toSwagger(schema)
    
      expect(openApiObject).toEqual({ type: 'string' })
    })

    it('should serialize nullable types', () => {
      const schema = z.string().nullable()
      const openApiObject = toSwagger(schema)
    
      expect(openApiObject).toEqual({ type: 'string', nullable: true })
    })

    it('should serialize partial objects', () => {
      const schema = z
        .object({
          prop1: z.string(),
          prop2: z.string(),
        })
        .partial()

      const swaggerSchema = toSwagger(schema);
    
      expect(swaggerSchema).toEqual(expect.objectContaining({
        type: 'object',
        properties: {
          prop1: {
            type: 'string',
          },
          prop2: {
            type: 'string',
          },
        }
      }));

      expect(swaggerSchema.required || []).toEqual([]);
    })

    it('should serialize lazy schema', () => {
      const schema = z.lazy(() => z.string())
      expect(toSwagger(schema)).toEqual({ type: 'string' })
    })

    describe('scalar types', () => {
      it('should serialize string', () => {
        const schema = z.string()
        expect(toSwagger(schema)).toEqual({ type: 'string' })
      })

      it('should serialize number', () => {
        const schema = z.number()
        expect(toSwagger(schema)).toEqual({ type: 'number' })
      });

      it('should serialize boolean', () => {
        const schema = z.boolean()
        expect(toSwagger(schema)).toEqual({ type: 'boolean' })
      });
    })
  })
  