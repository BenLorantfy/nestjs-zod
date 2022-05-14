import {
  INVALID,
  ParseInput,
  ParseReturnType,
  ParseStatus,
  ZodParsedType,
  ZodType,
  ZodTypeDef,
} from 'zod'
import { ZodIssueCode, addIssueToContext } from './issues'
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
  | { kind: 'minYear'; value: number; message?: string }
  | { kind: 'maxYear'; value: number; message?: string }
  | { kind: 'weekDay'; message?: string }
  | { kind: 'weekend'; message?: string }

export interface ZodDateStringDef extends ZodTypeDef {
  checks: ZodIsoDateCheck[]
  typeName: ZodFirstPartyTypeKindExtended
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
      if (check.kind === 'minYear') {
        const invalid = date.getFullYear() < check.value
        if (!invalid) continue

        addIssueToContext(context, {
          code: ZodIssueCode.too_small,
          type: 'iso_date_year',
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
          type: 'iso_date_year',
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

  static create = (params?: RawCreateParams): ZodDateString => {
    return new ZodDateString({
      checks: [],
      typeName: ZodFirstPartyTypeKindExtended.ZodDateString,
      ...processCreateParams(params),
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

  get _minYear() {
    return findCheck(this._def.checks, 'minYear')
  }

  get _maxYear() {
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
