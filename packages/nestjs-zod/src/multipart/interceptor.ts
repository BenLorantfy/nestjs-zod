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
      const parsed = parseFormData(req.body as Record<string, string | string[]>)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files: any[] = req.files ?? []
      for (const file of files) {
        const key = file.fieldname as string
        const existing = parsed[key]
        if (existing === undefined) {
          parsed[key] = file
        } else if (Array.isArray(existing)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(existing as any[]).push(file)
        } else {
          parsed[key] = [existing, file]
        }
      }

      req.body = parsed
    }

    return next.handle()
  }
}
