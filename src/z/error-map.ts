import {
  ZodErrorMap,
  defaultErrorMap,
  ZodIssueOptionalMessage as ZodIssueOptionalMessageDefault,
  setErrorMap,
} from 'zod'
import { ZodIssueCode, ZodIssueOptionalMessage } from './issues'

type ErrorMapContext = Parameters<ZodErrorMap>[1]

type ZodErrorMapExtended = (
  issue: ZodIssueOptionalMessage,
  context: ErrorMapContext
) => ReturnType<ZodErrorMap>

const extendedErrorMap: ZodErrorMapExtended = (issue, context) => {
  if (issue.code === ZodIssueCode.invalid_date_string_day) {
    const mapper: Record<typeof issue['expected'], string> = {
      weekDay: 'week day',
      weekend: 'weekend',
    }

    const readable = mapper[issue.expected]
    const message = `Invalid date, expected it to be a ${readable}`
    return { message }
  }

  if (issue.code === ZodIssueCode.too_small && issue.type === 'iso_date_year') {
    const appendix = issue.inclusive ? 'or equal to ' : ''
    const message = `Year must be greater than ${appendix}${issue.minimum}`
    return { message }
  }

  if (issue.code === ZodIssueCode.too_big && issue.type === 'iso_date_year') {
    const appendix = issue.inclusive ? 'or equal to ' : ''
    const message = `Year must be less than ${appendix}${issue.maximum}`
    return { message }
  }

  return defaultErrorMap(issue as ZodIssueOptionalMessageDefault, context)
}

function setExtendedErrorMap(map: ZodErrorMapExtended) {
  setErrorMap(map)
}

setExtendedErrorMap(extendedErrorMap)

export {
  extendedErrorMap as defaultErrorMap,
  setExtendedErrorMap as setErrorMap,
}
export type { ZodErrorMapExtended as ZodErrorMap }
