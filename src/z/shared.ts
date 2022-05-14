import { ZodErrorMap } from './error-map'

export type ErrorMessage = string | { message?: string }

export function normalizeErrorMessage(message?: ErrorMessage) {
  if (typeof message === 'string') return { message }
  return message
}

export interface RawCreateParams {
  errorMap?: ZodErrorMap
  invalid_type_error?: string
  required_error?: string
  description?: string
}

interface ProcessedCreateParams {
  errorMap?: ZodErrorMap
  description?: string
}

export function processCreateParams(
  params?: RawCreateParams
): ProcessedCreateParams {
  if (!params) return {}

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { errorMap, invalid_type_error, required_error, description } = params

  if (errorMap && (invalid_type_error || required_error)) {
    throw new Error(
      `Can't use "invalid" or "required" in conjunction with custom error map.`
    )
  }

  if (errorMap) return { errorMap, description }

  const customMap: ZodErrorMap = (issue, context) => {
    if (issue.code !== 'invalid_type') return { message: context.defaultError }
    if (typeof context.data === 'undefined' && required_error)
      return { message: required_error }
    if (params.invalid_type_error) return { message: params.invalid_type_error }
    return { message: context.defaultError }
  }

  return { errorMap: customMap, description }
}

export function findCheck<
  TCheck extends { kind: string },
  TKind extends TCheck['kind'],
  TSearch extends TKind,
  TFound extends { kind: TSearch } & TCheck
>(checks: TCheck[], kind: TSearch) {
  return checks.find((check) => check.kind === kind) as TFound | undefined
}

export function hasCheck<
  TCheck extends { kind: string },
  TKind extends TCheck['kind'],
  TSearch extends TKind
>(checks: TCheck[], kind: TSearch) {
  return Boolean(findCheck(checks, kind))
}
