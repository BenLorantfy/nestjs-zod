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
import { ZodSchema } from 'zod'
import { ZodDto } from './dto'
import { validate } from './validate'
import { createZodSerializationException } from './exception'

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector'

export const ZodSerializerDtoOptions = 'ZOD_SERIALIZER_DTO_OPTIONS' as const

export const ZodSerializerDto = (dto: ZodDto | ZodSchema) =>
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

        return Array.isArray(res)
          ? res.map((item) =>
              validate(item, responseSchema, createZodSerializationException)
            )
          : validate(res, responseSchema, createZodSerializationException)
      })
    )
  }

  protected getContextResponseSchema(
    context: ExecutionContext
  ): ZodDto | ZodSchema | undefined {
    return this.reflector.getAllAndOverride(ZodSerializerDtoOptions, [
      context.getHandler(),
      context.getClass(),
    ])
  }
}
