import { ZodIssueCode } from 'zod/v3'
import { DateStringFormat, ZodAnyDateStringIssue } from '../issues'
import { createCustomMapper, createMinMaxMapper } from './shared'

export const dateStringCustom = createCustomMapper<ZodAnyDateStringIssue>(
  (params) => {
    if (params.code === 'invalid_date_string') {
      const message = `Invalid string, expected it to be a valid date`
      return { matched: true, message }
    }

    if (params.code === 'invalid_date_string_format') {
      const mapper: Record<DateStringFormat, string> = {
        'date': 'YYYY-MM-DD (RFC3339 "full-date")',
        'date-time': 'YYYY-MM-DDTHH:mm:ssZ (RFC3339 "date-time")',
      }

      const readable = mapper[params.expected]
      const message = `Invalid date, expected it to match ${readable}`
      return { matched: true, message }
    }

    if (params.code === 'invalid_date_string_direction') {
      const message = `Invalid date, expected it to be the ${params.expected}`
      return { matched: true, message }
    }

    if (params.code === 'invalid_date_string_day') {
      const mapper: Record<typeof params['expected'], string> = {
        weekDay: 'week day',
        weekend: 'weekend',
      }

      const readable = mapper[params.expected]
      const message = `Invalid date, expected it to be a ${readable}`
      return { matched: true, message }
    }

    return { matched: false }
  }
)

export const dateStringYearMinMax = createMinMaxMapper(
  'date_string_year',
  (issue) => {
    if (issue.code === ZodIssueCode.too_small) {
      const appendix = issue.inclusive ? 'or equal to ' : ''
      const message = `Year must be greater than ${appendix}${issue.minimum}`
      return { matched: true, message }
    }

    if (issue.code === ZodIssueCode.too_big) {
      const appendix = issue.inclusive ? 'or equal to ' : ''
      const message = `Year must be less than ${appendix}${issue.maximum}`
      return { matched: true, message }
    }

    return { matched: false }
  }
)
