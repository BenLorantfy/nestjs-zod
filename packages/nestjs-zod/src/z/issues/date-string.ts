import { ZodIssueBase, ZodIssueCode } from 'zod'

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

export type ZodAnyDateStringIssue =
  | ZodInvalidDateStringIssue
  | ZodInvalidDateStringFormatIssue
  | ZodInvalidDateStringDirectionIssue
  | ZodInvalidDateStringDayIssue
