import { SafeParseReturnType, ZodSchema } from 'zod/v3'
import { password } from './password'

describe('password', () => {
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
    schema = password()
    is(undefined, false)
    is(123, false)
  })

  it('should validate at least one digit', () => {
    schema = password().atLeastOne('digit')
    is('sdfghfd4isugh', true)
    is('Aihsdgih!', false)
  })

  it('should validate at least one lowercase', () => {
    schema = password().atLeastOne('lowercase')
    is('SDFUfFIDD', true)
    is('DSIFHUSDHUF!3', false)
  })

  it('should validate at least one uppercase', () => {
    schema = password().atLeastOne('uppercase')
    is('fdhgidUhfg', true)
    is('dsifghfodih!3', false)
  })

  it('should validate at least one special', () => {
    schema = password().atLeastOne('special')

    const chars = `!?@#$%^&*{};.,:%№"|\\/()-_+=<>\`~[]'"`

    for (const char of chars) {
      is(`asfosd${char}sadfas`, true)
    }

    is('Aihsdgih3', false)
  })

  const small = '213'
  const middle = '324234289'
  const big = '23476237486243786237846234728436487263487627436'

  it('should validate min/max length', () => {
    schema = password().min(8).max(20)

    is(small, false)
    is(middle, true)
    is(big, false)
  })

  test('min/max should override previous min/max', () => {
    schema = password().min(8).max(20).min(1).max(999)

    is(small, true)
    is(middle, true)
    is(big, true)
  })

  it('should validate min and max edge cases', () => {
    schema = password().min(2).max(4)

    is('22', true)
    is('4444', true)
  })
})
