/* eslint-disable import/export */

/*
 * Here, we override Zod exports with our custom entities
 * It's one of the recommended ways to extend Zod:
 * https://github.com/colinhacks/zod/issues/465#issuecomment-847479217
 */

export type { ZodErrorMap } from '../error-map'
export { defaultErrorMap, setErrorMap } from '../error-map'
export * from '../generic-types'
export type {
  ZodInvalidDateStringDayIssue,
  ZodIssue,
  ZodIssueOptionalMessage,
  ZodTooBigIssue,
  ZodTooSmallIssue,
} from '../issues'
export { addIssueToContext } from '../issues'
export * from '../new-types'
export * from '../type-names'
export * from 'zod/v3'
