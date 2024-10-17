import { SafeParseReturnType, ZodSchema } from 'zod'
import { dateString } from './date-string'

describe('dateString', () => {
  let schema: ZodSchema
  let result: SafeParseReturnType<unknown, unknown>

  function is(value: unknown, expected: boolean) {
    result = schema.safeParse(value)
    expect(result.success).toBe(expected)
    if (!result.success) {
      expect(result.error.errors).toMatchSnapshot()
    }
  }

  it('should validate type', () => {
    schema = dateString()
    is(undefined, false)
    is(123, false)
  })

  it('should validate date', () => {
    schema = dateString()
    is('', false)
  })

  it('should validate default format', () => {
    schema = dateString()
    is('2017-08-20', false)
  })

  it('should validate specified format', () => {
    schema = dateString().format('date')
    is('2017-08-20', true)

    schema = dateString().format('date')
    is('2017-08-20T20:00:00Z', false)

    schema = dateString().format('date-time')
    is('2017-08-20T20:00:00Z', true)

    schema = dateString().format('date-time')
    is('2017-08-20', false)
  })

  test('format should override previous format', () => {
    schema = dateString().format('date').format('date-time').format('date')
    is('2017-08-20', true)
  })

  it('should accept all date-time variations', () => {
    schema = dateString().format('date-time')

    is('2017-08-20T20:00:00Z', true)
    is('2017-08-20T20:00:00.000Z', true)
    is('2017-08-20T20:00:00+00:00', true)
    is('2017-08-20T20:00:00-00:00', true)
    is('2017-08-20T20:00:00.000+00:00', true)
    is('2017-08-20T20:00:00.000-00:00', true)
  })

  const past = '2017-08-20T20:00:00Z'
  const future = '2322-08-20T20:00:00Z'

  it('should validate direction', () => {
    schema = dateString().past()

    is(past, true)
    is(future, false)

    schema = dateString().future()

    is(future, true)
    is(past, false)
  })

  test('direction should override previous direction', () => {
    schema = dateString().past().future().past()
    is(past, true)
  })

  const small = '1998-08-20T20:00:00Z'
  const middle = '2022-08-20T20:00:00Z'
  const big = '2322-08-20T20:00:00Z'

  it('should validate min/max year', () => {
    schema = dateString().minYear(2000).maxYear(2100)

    is(small, false)
    is(middle, true)
    is(big, false)
  })

  test('min/max should override previous min/max', () => {
    schema = dateString()
      .minYear(2000)
      .maxYear(2100)
      .minYear(1800)
      .maxYear(2400)

    is(small, true)
    is(middle, true)
    is(big, true)
  })

  it('should validate min and max edge cases', () => {
    schema = dateString().format('date').minYear(2000).maxYear(2100)

    is('2000-08-20', true)
    is('2100-08-20', true)
  })

  it('should validate week days', () => {
    schema = dateString().format('date').weekDay()

    is('2022-05-09', true)
    is('2022-05-10', true)
    is('2022-05-11', true)
    is('2022-05-12', true)
    is('2022-05-13', true)
    is('2022-05-14', false)
    is('2022-05-15', false)

    schema = dateString().format('date').weekend()

    is('2022-05-09', false)
    is('2022-05-10', false)
    is('2022-05-11', false)
    is('2022-05-12', false)
    is('2022-05-13', false)
    is('2022-05-14', true)
    is('2022-05-15', true)
  })

  test('day-type should override previous day-type', () => {
    schema = dateString().format('date').weekDay().weekend()

    is('2022-05-09', false)
    is('2022-05-10', false)
    is('2022-05-11', false)
    is('2022-05-12', false)
    is('2022-05-13', false)
    is('2022-05-14', true)
    is('2022-05-15', true)
  })

  it('should cast to Date when .cast is used', () => {
    schema = dateString().cast()

    const string = '2017-08-20T20:00:00Z'
    is(string, true)
    result = schema.safeParse(string)
    if (!result.success) return
    expect(result.data).toBeInstanceOf(Date)
  })
})
