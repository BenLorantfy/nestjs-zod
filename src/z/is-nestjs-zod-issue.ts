import { NestJsZodIssue, ZodIssueOptionalMessage } from './issues'

// Inline code to prevent bundling zod in frontend package
const CUSTOM_ISSUE_CODE = 'custom'

export function isNestJsZodIssue(
  issue: ZodIssueOptionalMessage
): issue is NestJsZodIssue {
  return issue.code === CUSTOM_ISSUE_CODE && issue.params?.isNestJsZod
}
