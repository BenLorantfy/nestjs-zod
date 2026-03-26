import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { parseFormData } from './parse-form-data'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runMulter(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const multer = require('multer')
      multer().any()(req, res, (err: unknown) => {
        if (err) reject(err)
        else resolve()
      })
    } catch {
      resolve()
    }
  })
}

@Injectable()
export class ZodMultipartInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = context.switchToHttp().getRequest<any>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = context.switchToHttp().getResponse<any>()

    const contentType: string = req.headers?.['content-type'] ?? ''

    if (contentType.includes('multipart/form-data') && req.body == null) {
      await runMulter(req, res)
    }

    if (req.body != null && typeof req.body === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files: any[] = req.files ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flatBody = req.body as Record<string, any>
      for (const file of files) {
        flatBody[file.fieldname as string] = file
      }

      req.body = parseFormData(flatBody)
    }

    return next.handle()
  }
}
