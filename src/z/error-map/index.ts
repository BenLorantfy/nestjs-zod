import {
  ZodErrorMap,
  defaultErrorMap,
  ZodIssueOptionalMessage as ZodIssueOptionalMessageDefault,
  setErrorMap,
} from 'zod'
import { ZodIssueOptionalMessage } from '../issues'
import { dateStringCustom, dateStringYearMinMax } from './date-string'
import { passwordCustom, passwordMinMax } from './password'
import { composeMappers } from './shared'

type ErrorMapContext = Parameters<ZodErrorMap>[1]

type ZodErrorMapExtended = (
  issue: ZodIssueOptionalMessage,
  context: ErrorMapContext
) => ReturnType<ZodErrorMap>

const mapper = composeMappers([
  dateStringCustom,
  dateStringYearMinMax,
  passwordCustom,
  passwordMinMax,
])

const extendedErrorMap: ZodErrorMapExtended = (issue, context) => {
  const result = mapper(issue)

  if (result.matched) {
    return { message: result.message }
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
