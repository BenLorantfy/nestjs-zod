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
import { $ZodArray, $ZodUnknown, parse } from 'zod/v4/core'

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector'

export const ZodSerializerDtoOptions = 'ZOD_SERIALIZER_DTO_OPTIONS' as const

export const ZodSerializerDto = (dto: ZodDto<UnknownSchema> | UnknownSchema | [ZodDto<UnknownSchema>] | [UnknownSchema]) =>
  SetMetadata(ZodSerializerDtoOptions, dto)

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
          const unknownSchema = new $ZodUnknown({ type: 'unknown' })
          const arrSchema = new $ZodArray({ type: 'array', element: unknownSchema });
          
          let parsedRes: unknown[] = []
          try {
            parsedRes = parse(arrSchema, res)
          } catch (err) {
            throw createZodSerializationException(err)
          }

          return parsedRes.map((item) =>
            validate(item, responseSchema[0], createZodSerializationException)
          )
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
