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

const ZodIssueCodeExtended = {
  ...ZodIssueCode,
  invalid_date_string_format: 'invalid_date_string_format' as const,
  invalid_date_string_day: 'invalid_date_string_day' as const,
}

type ZodIssueCodeExtended = keyof typeof ZodIssueCodeExtended

export type DateStringFormat = 'date' | 'date-time'

export interface ZodInvalidDateStringFormat extends ZodIssueBase {
  code: typeof ZodIssueCodeExtended.invalid_date_string_format
  expected: DateStringFormat
}

export interface ZodInvalidDateStringDayIssue extends ZodIssueBase {
  code: typeof ZodIssueCodeExtended.invalid_date_string_day
  expected: 'weekDay' | 'weekend'
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

type ZodIssueOptionalMessageExtended =
  | ZodIssueOptionalMessage
  | ZodInvalidDateStringFormat
  | ZodInvalidDateStringDayIssue
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

export { ZodIssueCodeExtended as ZodIssueCode }
export { addIssueToContextExtended as addIssueToContext }
export type { ZodIssueOptionalMessageExtended as ZodIssueOptionalMessage }
export type { ZodIssueExtended as ZodIssue }
