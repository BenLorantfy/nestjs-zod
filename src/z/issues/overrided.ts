import { ZodIssueBase, ZodIssueCode } from 'zod'

/*
 * If you add a new string to "Type" union,
 * don't forget to handle it in "extendedErrorMap" function
 * Otherwise, there may be a runtime error
 */

export type ZodMinMaxValueType =
  | 'array'
  | 'string'
  | 'number'
  | 'set'
  | 'date_string_year'
  | 'password'

export interface ZodTooSmallIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_small
  minimum: number
  inclusive: boolean
  type: ZodMinMaxValueType
}

export interface ZodTooBigIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_big
  maximum: number
  inclusive: boolean
  type: ZodMinMaxValueType
}
