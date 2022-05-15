/* eslint-disable import/export */

/*
 * Here, we override Zod exports with our custom entities
 * It's one of the recommended ways to extend Zod:
 * https://github.com/colinhacks/zod/issues/465#issuecomment-847479217
 */

export * from 'zod'

export { defaultErrorMap, setErrorMap } from '../error-map'
export type { ZodErrorMap } from '../error-map'

export { addIssueToContext } from '../issues'
export type {
  ZodIssue,
  ZodIssueOptionalMessage,
  ZodInvalidDateStringDayIssue,
  ZodTooBigIssue,
  ZodTooSmallIssue,
} from '../issues'

export * from '../type-names'
export * from '../new-types'
