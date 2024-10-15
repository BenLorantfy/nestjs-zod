import {
  addIssueToContext,
  IssueData,
  ParseContext,
  ZodIssueOptionalMessage,
} from 'zod'
import { ZodAnyDateStringIssue } from './date-string'
import { ZodTooBigIssue, ZodTooSmallIssue } from './overrided'
import { ZodAnyPasswordIssue } from './password'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type StripPath<T extends object> = T extends any
  ? Omit<T, 'path'>
  : never

export type NestJsZodIssue = ZodAnyDateStringIssue | ZodAnyPasswordIssue

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

export * from './date-string'
export * from './overrided'
export * from './password'
