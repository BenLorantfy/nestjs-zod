import { ZodIssueCode } from 'zod'
import { NestJsZodIssue, ZodIssueOptionalMessage } from './issues'

export function isNestJsZodIssue(
  issue: ZodIssueOptionalMessage
): issue is NestJsZodIssue {
  return issue.code === ZodIssueCode.custom && issue.params?.isNestJsZod
}
