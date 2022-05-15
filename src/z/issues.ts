import {
  addIssueToContext,
  IssueData,
  ParseContext,
  ZodIssueBase,
  ZodIssueCode,
  ZodIssueOptionalMessage,
} from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type StripPath<T extends object> = T extends any
  ? Omit<T, 'path'>
  : never

export type DateStringFormat = 'date' | 'date-time'
export type DateStringDirection = 'past' | 'future'
export type DateStringDayType = 'weekDay' | 'weekend'

export interface ZodInvalidDateStringIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_date_string'
  }
}

export interface ZodInvalidDateStringFormatIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_date_string_format'
    expected: DateStringFormat
  }
}

export interface ZodInvalidDateStringDirectionIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_date_string_direction'
    expected: DateStringDirection
  }
}

export interface ZodInvalidDateStringDayIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_date_string_day'
    expected: DateStringDayType
  }
}

/*
 * If you add a new string to "type" union,
 * don't forget to handle it in "extendedErrorMap" function
 * Otherwise, there may be a runtime error
 */

export interface ZodTooSmallIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_small
  minimum: number
  inclusive: boolean
  // see comment above
  type: 'array' | 'string' | 'number' | 'set' | 'date_string_year'
}

export interface ZodTooBigIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_big
  maximum: number
  inclusive: boolean
  // see comment above
  type: 'array' | 'string' | 'number' | 'set' | 'date_string_year'
}

export type NestJsZodIssue =
  | ZodInvalidDateStringIssue
  | ZodInvalidDateStringFormatIssue
  | ZodInvalidDateStringDirectionIssue
  | ZodInvalidDateStringDayIssue

type ZodIssueOptionalMessageExtended =
  | ZodIssueOptionalMessage
  | NestJsZodIssue
  | ZodTooSmallIssue
  | ZodTooBigIssue

type ZodIssueExtended = ZodIssueOptionalMessageExtended & { message: string }

// for some reason "type" field breaks when using default Omit
type IssueDataExtended = StripPath<ZodIssueOptionalMessageExtended> & {
  path?: (string | number)[]
  fatal?: boolean
}

function addIssueToContextExtended(
  context: ParseContext,
  issueData: IssueDataExtended
) {
  addIssueToContext(context, issueData as IssueData)
}

export { addIssueToContextExtended as addIssueToContext }
export type { ZodIssueOptionalMessageExtended as ZodIssueOptionalMessage }
export type { ZodIssueExtended as ZodIssue }
