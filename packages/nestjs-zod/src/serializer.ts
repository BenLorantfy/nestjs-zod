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
import { ZodDto } from './dto'
import { validate } from './validate'
import { createZodSerializationException } from './exception'
import { UnknownSchema } from './types'
import { assert } from './assert'

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector'

export const ZodSerializerDtoOptions = 'ZOD_SERIALIZER_DTO_OPTIONS' as const

export const ZodSerializerDto = (dto: ZodDto<UnknownSchema> | UnknownSchema | [ZodDto<UnknownSchema>] | [UnknownSchema]) => {
  if (Array.isArray(dto)) {
    const schema = 'schema' in dto[0] ? dto[0].schema : dto[0]
    assert('array' in schema && typeof schema.array === 'function', 'ZodSerializerDto was used with array syntax (e.g. `ZodSerializerDto([MyDto])`) but the DTO schema does not have an array method')
  }
  
  return SetMetadata(ZodSerializerDtoOptions, dto);
}

@Injectable()
export class ZodSerializerInterceptor implements NestInterceptor {
  constructor(@Inject(REFLECTOR) protected readonly reflector: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const responseSchema = this.getContextResponseSchema(context)

    return next.handle().pipe(
      map((res: object | object[]) => {
        if (!responseSchema) return res
        if (typeof res !== 'object' || res instanceof StreamableFile) return res

        if (Array.isArray(responseSchema)) {
          const schema = 'schema' in responseSchema[0] ? responseSchema[0].schema : responseSchema[0]
          assert('array' in schema && typeof schema.array === 'function', 'ZodSerializerDto was used with array syntax (e.g. `ZodSerializerDto([MyDto])`) but the DTO schema does not have an array method')

          return validate(res, schema.array(), createZodSerializationException)
        }

        return validate(res, responseSchema, createZodSerializationException)
      })
    )
  }

  protected getContextResponseSchema(
    context: ExecutionContext
  ): ZodDto<UnknownSchema> | UnknownSchema | [ZodDto<UnknownSchema>] | [UnknownSchema] | undefined {
    return this.reflector.getAllAndOverride(ZodSerializerDtoOptions, [
      context.getHandler(),
      context.getClass(),
    ])
  }
}
