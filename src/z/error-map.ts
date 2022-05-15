import {
  ZodErrorMap,
  defaultErrorMap,
  ZodIssueOptionalMessage as ZodIssueOptionalMessageDefault,
  setErrorMap,
} from 'zod'
import {
  DateStringFormat,
  ZodIssueCode,
  ZodIssueOptionalMessage,
} from './issues'

type ErrorMapContext = Parameters<ZodErrorMap>[1]

type ZodErrorMapExtended = (
  issue: ZodIssueOptionalMessage,
  context: ErrorMapContext
) => ReturnType<ZodErrorMap>

const extendedErrorMap: ZodErrorMapExtended = (issue, context) => {
  /*
   * At first, we should handle the custom Issues,
   * because defaultErrorMap throws an Error when no match found
   */

  if (issue.code === ZodIssueCode.invalid_date_string_format) {
    const mapper: Record<DateStringFormat, string> = {
      'date': 'YYYY-MM-DD',
      'date-time': 'YYYY-MM-DDTHH:mm:ssZ',
    }

    const readable = mapper[issue.expected]
    const message = `Invalid date, expected it to match format: ${readable}`
    return { message }
  }

  if (issue.code === ZodIssueCode.invalid_date_string_direction) {
    const message = `Invalid date, expected it to be the ${issue.expected}`
    return { message }
  }

  if (issue.code === ZodIssueCode.invalid_date_string_day) {
    const mapper: Record<typeof issue['expected'], string> = {
      weekDay: 'week day',
      weekend: 'weekend',
    }

    const readable = mapper[issue.expected]
    const message = `Invalid date, expected it to be a ${readable}`
    return { message }
  }

  if (
    issue.code === ZodIssueCode.too_small &&
    issue.type === 'date_string_year'
  ) {
    const appendix = issue.inclusive ? 'or equal to ' : ''
    const message = `Year must be greater than ${appendix}${issue.minimum}`
    return { message }
  }

  if (
    issue.code === ZodIssueCode.too_big &&
    issue.type === 'date_string_year'
  ) {
    const appendix = issue.inclusive ? 'or equal to ' : ''
    const message = `Year must be less than ${appendix}${issue.maximum}`
    return { message }
  }

  /*
   * At this moment, there are no custom Issues remained,
   * so we can safely delegate the control to defaultErrorMap
   */

  return defaultErrorMap(issue as ZodIssueOptionalMessageDefault, context)
}

function setExtendedErrorMap(map: ZodErrorMapExtended) {
  setErrorMap(map)
}

// set custom errorMap before any user code is executed
setExtendedErrorMap(extendedErrorMap)

export {
  extendedErrorMap as defaultErrorMap,
  setExtendedErrorMap as setErrorMap,
}
export type { ZodErrorMapExtended as ZodErrorMap }
