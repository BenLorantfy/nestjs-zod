import { ZodIssueCode } from 'zod/v3'
import { ZodAnyPasswordIssue } from '../issues'
import { createCustomMapper, createMinMaxMapper } from './shared'

export const passwordCustom = createCustomMapper<ZodAnyPasswordIssue>(
  (params) => {
    if (params.code === 'invalid_password_no_digit') {
      const message = `Password must contain at least one digit`
      return { matched: true, message }
    }

    if (params.code === 'invalid_password_no_lowercase') {
      const message = `Password must contain at least one lowercase letter`
      return { matched: true, message }
    }

    if (params.code === 'invalid_password_no_uppercase') {
      const message = `Password must contain at least one uppercase letter`
      return { matched: true, message }
    }

    if (params.code === 'invalid_password_no_special') {
      const message = `Password must contain at least one special symbol`
      return { matched: true, message }
    }

    return { matched: false }
  }
)

export const passwordMinMax = createMinMaxMapper('password', (issue) => {
  if (issue.code === ZodIssueCode.too_small) {
    const appendix = issue.inclusive ? 'or equal to ' : ''
    const message = `Password length must be greater than ${appendix}${issue.minimum}`
    return { matched: true, message }
  }

  if (issue.code === ZodIssueCode.too_big) {
    const appendix = issue.inclusive ? 'or equal to ' : ''
    const message = `Password length must be less than ${appendix}${issue.maximum}`
    return { matched: true, message }
  }

  return { matched: false }
})
