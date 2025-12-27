import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  SetMetadata,
  StreamableFile,
} from '@nestjs/common'
import { map, Observable } from 'rxjs'
import { isZodDto, ZodDto } from './dto'
import { createZodSerializationException } from './exception'
import { UnknownSchema } from './types'
import { assert } from './assert'

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector'

export const ZodSerializerDtoOptions = 'ZOD_SERIALIZER_DTO_OPTIONS' as const

export function ZodSerializerDto(dto: ZodDto | UnknownSchema | [ZodDto] | [UnknownSchema]) {
  if (Array.isArray(dto)) {
    const schema = 'schema' in dto[0] ? dto[0].schema : dto[0]
    assert('array' in schema && typeof schema.array === 'function', 'ZodSerializerDto was used with array syntax (e.g. `ZodSerializerDto([MyDto])`) but the DTO schema does not have an array method')
  }
  
  return SetMetadata(ZodSerializerDtoOptions, dto);
}

interface ZodSerializerInterceptorOptions {
  reportInput?: boolean
}

type ZodSerializerInterceptorClass = new (...args: unknown[]) => {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>
}

export function createZodSerializerInterceptor({
  reportInput,
}: ZodSerializerInterceptorOptions = {}): ZodSerializerInterceptorClass {
  @Injectable()
  class ZodSerializerInterceptor implements NestInterceptor {
    constructor(@Inject(REFLECTOR) protected readonly reflector: any) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const responseSchema = this.getContextResponseSchema(context)

      return next.handle().pipe(
        map((res: object | object[]) => {
          if (!responseSchema) return res
          if (res instanceof StreamableFile) return res

          if (Array.isArray(responseSchema)) {
            const schemaOrDto = responseSchema[0]
            const schema = 'schema' in schemaOrDto ? schemaOrDto.schema : schemaOrDto
            assert('array' in schema && typeof schema.array === 'function', 'ZodSerializerDto was used with array syntax (e.g. `ZodSerializerDto([MyDto])`) but the DTO schema does not have an array method')
            
            const arrSchema = schema.array()

            if (isZodDto(schemaOrDto)) {
              if (schemaOrDto.codec) {
                assert(arrSchema.encode, 'Schema does not have an encode method');

                try {
                  return arrSchema.encode(res, reportInput !== undefined ? { reportInput } : undefined)
                } catch (error) {
                  throw createZodSerializationException(error)
                }
              }

              try {
                return arrSchema.parse(res, reportInput !== undefined ? { reportInput } : undefined)
              } catch (error) {
                throw createZodSerializationException(error)
              }
            }

            try {
              return arrSchema.parse(res, reportInput !== undefined ? { reportInput } : undefined)
            } catch (error) {
              throw createZodSerializationException(error)
            }
          }

          if (isZodDto(responseSchema)) {
            if (responseSchema.codec) {
              assert(responseSchema.schema.encode, 'Schema does not have an encode method');

              try {
                return responseSchema.schema.encode(res, reportInput !== undefined ? { reportInput } : undefined)
              } catch (error) {
                throw createZodSerializationException(error)
              }
            }

            try {
              return responseSchema.schema.parse(res, reportInput !== undefined ? { reportInput } : undefined)
            } catch (error) {
              throw createZodSerializationException(error)
            }
          }

          try {
            return responseSchema.parse(res, reportInput !== undefined ? { reportInput } : undefined)
          } catch (error) {
            throw createZodSerializationException(error)
          }
        })
      )
    }

    protected getContextResponseSchema(
      context: ExecutionContext
    ): ZodDto | UnknownSchema | [ZodDto] | [UnknownSchema] | undefined {
      return this.reflector.getAllAndOverride(ZodSerializerDtoOptions, [
        context.getHandler(),
        context.getClass(),
      ])
    }
  }

  return ZodSerializerInterceptor
}

export const ZodSerializerInterceptor = createZodSerializerInterceptor()
