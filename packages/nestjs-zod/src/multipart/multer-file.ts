import { z } from 'zod'

export interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
  destination?: string
  filename?: string
  path?: string
  stream?: NodeJS.ReadableStream
}

interface MulterConstraints {
  mimeType?: string[]
  maxSize?: number
  minSize?: number
}

const SIZE_UNITS: Record<string, number> = {
  b: 1, o: 1,
  ko: 1024, kb: 1024,
  mo: 1024 ** 2, mb: 1024 ** 2,
  go: 1024 ** 3, gb: 1024 ** 3,
  to: 1024 ** 4, tb: 1024 ** 4,
}

function parseSize(input: number | string): number {
  if (typeof input === 'number') return input
  const trimmed = input.trim()
  if (!isNaN(Number(trimmed))) return Math.round(Number(trimmed))
  const match = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/.exec(trimmed)
  if (!match) throw new Error(`Invalid size: "${input}"`)
  const value = parseFloat(match[1].replace(',', '.'))
  const multiplier = SIZE_UNITS[match[2].toLowerCase()]
  if (!multiplier) throw new Error(`Unknown size unit: "${match[2]}"`)
  return Math.round(value * multiplier)
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${+(bytes / 1024 ** 4).toFixed(1)} To`
  if (bytes >= 1024 ** 3) return `${+(bytes / 1024 ** 3).toFixed(1)} Go`
  if (bytes >= 1024 ** 2) return `${+(bytes / 1024 ** 2).toFixed(1)} Mo`
  if (bytes >= 1024) return `${+(bytes / 1024).toFixed(1)} Ko`
  return `${bytes} o`
}

function buildMeta(constraints: MulterConstraints): Record<string, unknown> {
  const parts: string[] = []
  if (constraints.mimeType?.length) {
    parts.push(`Allowed types: ${constraints.mimeType.join(', ')}`)
  }
  if (constraints.maxSize !== undefined) {
    parts.push(`Max size: ${formatSize(constraints.maxSize)}`)
  }
  if (constraints.minSize !== undefined) {
    parts.push(`Min size: ${formatSize(constraints.minSize)}`)
  }
  const meta: Record<string, unknown> = { type: 'string', format: 'binary' }
  if (parts.length) meta.description = parts.join('. ')
  return meta
}

function isMulterFile(val: unknown): boolean {
  if (typeof val !== 'object' || val === null) return false
  const f = val as Record<string, unknown>
  return (
    typeof f.fieldname === 'string' &&
    typeof f.originalname === 'string' &&
    typeof f.encoding === 'string' &&
    typeof f.mimetype === 'string' &&
    typeof f.size === 'number'
  )
}

export type ZodMulterFileSchema = z.ZodCustom<MulterFile> & {
  mimeType(allowedTypes: string | string[]): ZodMulterFileSchema
  maxSize(size: number | string): ZodMulterFileSchema
  minSize(size: number | string): ZodMulterFileSchema
}

function withMethods(
  schema: z.ZodCustom<MulterFile>,
  constraints: MulterConstraints = {},
): ZodMulterFileSchema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema._zod.toJSONSchema = () => buildMeta(constraints)

  return Object.assign(schema, {
    mimeType(allowedTypes: string | string[]) {
      const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes]
      const next = { ...constraints, mimeType: types }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return withMethods((this as any).superRefine((file: MulterFile, ctx: z.RefinementCtx) => {
        if (!types.includes(file.mimetype)) {
          ctx.addIssue({
            code: 'custom',
            message: `Invalid MIME type "${file.mimetype}". Allowed: ${types.join(', ')}`,
          })
        }
      }), next)
    },
    maxSize(size: number | string) {
      const bytes = parseSize(size)
      const next = { ...constraints, maxSize: bytes }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return withMethods((this as any).superRefine((file: MulterFile, ctx: z.RefinementCtx) => {
        if (file.size > bytes) {
          ctx.addIssue({
            code: 'custom',
            message: `File too large: ${formatSize(file.size)} (max ${formatSize(bytes)})`,
          })
        }
      }), next)
    },
    minSize(size: number | string) {
      const bytes = parseSize(size)
      const next = { ...constraints, minSize: bytes }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return withMethods((this as any).superRefine((file: MulterFile, ctx: z.RefinementCtx) => {
        if (file.size < bytes) {
          ctx.addIssue({
            code: 'custom',
            message: `File too small: ${formatSize(file.size)} (min ${formatSize(bytes)})`,
          })
        }
      }), next)
    },
  })
}

export function zMulterFile(): ZodMulterFileSchema {
  return withMethods(
    z.custom<MulterFile>(isMulterFile, { message: 'Expected a Multer file object' }),
  )
}
