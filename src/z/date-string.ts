import {
  INVALID,
  ParseInput,
  ParseReturnType,
  ParseStatus,
  ZodParsedType,
  ZodType,
  ZodTypeDef,
} from 'zod'
import { ZodIssueCode, addIssueToContext, DateStringFormat } from './issues'
import {
  ErrorMessage,
  findCheck,
  hasCheck,
  normalizeErrorMessage,
  processCreateParams,
  RawCreateParams,
} from './shared'
import { ZodFirstPartyTypeKindExtended } from './type-names'

type ZodIsoDateCheck =
  | {
      kind: 'format'
      value: DateStringFormat
      regex: RegExp
      message?: string
    }
  | { kind: 'minYear'; value: number; message?: string }
  | { kind: 'maxYear'; value: number; message?: string }
  | { kind: 'weekDay'; message?: string }
  | { kind: 'weekend'; message?: string }

export interface ZodDateStringDef extends ZodTypeDef {
  checks: ZodIsoDateCheck[]
  typeName: ZodFirstPartyTypeKindExtended.ZodDateString
}

const formatToRegex: Record<DateStringFormat, RegExp> = {
  'date': /^\d{4}-\d{2}-\d{2}$/,
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/,
}

export class ZodDateString extends ZodType<string, ZodDateStringDef> {
  _parse(input: ParseInput): ParseReturnType<string> {
    const parsedType = this._getType(input)
    const context = this._getOrReturnCtx(input)

    const notString = parsedType !== ZodParsedType.string
    const date = new Date(input.data)

    if (notString || Number.isNaN(date.getTime())) {
      addIssueToContext(context, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: context.parsedType,
      })

      return INVALID
    }

    const status = new ParseStatus()

    for (const check of this._def.checks) {
      if (check.kind === 'format') {
        const valid = check.regex.test(input.data)
        if (valid) continue

        addIssueToContext(context, {
          code: ZodIssueCode.invalid_date_string_format,
          expected: check.value,
          message: check.message,
        })

        status.dirty()
      } else if (check.kind === 'minYear') {
        const invalid = date.getFullYear() < check.value
        if (!invalid) continue

        addIssueToContext(context, {
          code: ZodIssueCode.too_small,
          type: 'date_string_year',
          minimum: check.value,
          inclusive: true,
          message: check.message,
        })

        status.dirty()
      } else if (check.kind === 'maxYear') {
        const invalid = date.getFullYear() > check.value
        if (!invalid) continue

        addIssueToContext(context, {
          code: ZodIssueCode.too_big,
          type: 'date_string_year',
          maximum: check.value,
          inclusive: true,
          message: check.message,
        })

        status.dirty()
      } else if (check.kind === 'weekDay') {
        const day = date.getDay()
        const invalid = day === 0 || day === 6
        if (!invalid) continue

        addIssueToContext(context, {
          code: ZodIssueCode.invalid_date_string_day,
          expected: 'weekDay',
          message: check.message,
        })

        status.dirty()
      } else if (check.kind === 'weekend') {
        const day = date.getDay()
        const invalid = day !== 0 && day !== 6
        if (!invalid) continue

        addIssueToContext(context, {
          code: ZodIssueCode.invalid_date_string_day,
          expected: 'weekend',
          message: check.message,
        })

        status.dirty()
      }
    }

    return { status: status.value, value: input.data }
  }

  _addCheck(check: ZodIsoDateCheck) {
    return new ZodDateString({
      ...this._def,
      checks: [...this._def.checks, check],
    })
  }

  _replaceCheck(check: ZodIsoDateCheck) {
    return new ZodDateString({
      ...this._def,
      checks: this._def.checks
        .filter((item) => item.kind !== check.kind)
        .concat(check),
    })
  }

  static create = (params?: RawCreateParams): ZodDateString => {
    return new ZodDateString({
      checks: [
        {
          kind: 'format',
          value: 'date-time',
          regex: formatToRegex['date-time'],
        },
      ],
      typeName: ZodFirstPartyTypeKindExtended.ZodDateString,
      ...processCreateParams(params),
    })
  }

  format(format: DateStringFormat, message?: ErrorMessage) {
    return this._replaceCheck({
      kind: 'format',
      value: format,
      regex: formatToRegex[format],
      ...normalizeErrorMessage(message),
    })
  }

  minYear(year: number, message?: ErrorMessage) {
    return this._addCheck({
      kind: 'minYear',
      value: year,
      ...normalizeErrorMessage(message),
    })
  }

  maxYear(year: number, message?: ErrorMessage) {
    return this._addCheck({
      kind: 'maxYear',
      value: year,
      ...normalizeErrorMessage(message),
    })
  }

  weekDay(message?: ErrorMessage) {
    return this._addCheck({
      kind: 'weekDay',
      ...normalizeErrorMessage(message),
    })
  }

  weekend(message?: ErrorMessage) {
    return this._addCheck({
      kind: 'weekend',
      ...normalizeErrorMessage(message),
    })
  }

  get format_() {
    return findCheck(this._def.checks, 'format')
  }

  get minYear_() {
    return findCheck(this._def.checks, 'minYear')
  }

  get maxYear_() {
    return findCheck(this._def.checks, 'maxYear')
  }

  get isWeekDay() {
    return hasCheck(this._def.checks, 'weekDay')
  }

  get isWeekend() {
    return hasCheck(this._def.checks, 'weekend')
  }
}

export const dateString = ZodDateString.create
