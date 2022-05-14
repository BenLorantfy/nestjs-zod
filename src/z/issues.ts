import {
  addIssueToContext,
  IssueData,
  ParseContext,
  ZodIssueBase,
  ZodIssueCode,
  ZodIssueOptionalMessage,
} from 'zod'

type OmitKeys<T, K extends string> = Pick<T, Exclude<keyof T, K>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type StripPath<T extends object> = T extends any
  ? OmitKeys<T, 'path'>
  : never

const ZodIssueCodeExtended = {
  ...ZodIssueCode,
  invalid_date_string_day: 'invalid_date_string_day' as const,
}

type ZodIssueCodeExtended = keyof typeof ZodIssueCodeExtended

export interface ZodInvalidIsoDateDayIssue extends ZodIssueBase {
  code: typeof ZodIssueCodeExtended.invalid_date_string_day
  expected: 'weekDay' | 'weekend'
}

export interface ZodTooSmallIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_small
  minimum: number
  inclusive: boolean
  type: 'array' | 'string' | 'number' | 'set' | 'iso_date_year'
}

export interface ZodTooBigIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_big
  maximum: number
  inclusive: boolean
  type: 'array' | 'string' | 'number' | 'set' | 'iso_date_year'
}

type ZodIssueOptionalMessageExtended =
  | ZodIssueOptionalMessage
  | ZodInvalidIsoDateDayIssue
  | ZodTooSmallIssue
  | ZodTooBigIssue

type ZodIssueExtended = ZodIssueOptionalMessageExtended & { message: string }

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
