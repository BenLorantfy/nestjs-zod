import { ZodIssueCode } from 'zod'
import { isNestJsZodIssue } from '../is-nestjs-zod-issue'
import {
  NestJsZodIssue,
  ZodIssueOptionalMessage,
  ZodMinMaxValueType,
  ZodTooBigIssue,
  ZodTooSmallIssue,
} from '../issues'

type MapperResult =
  | {
      matched: false
    }
  | {
      matched: true
      message: string
    }

type Mapper = (issue: ZodIssueOptionalMessage) => MapperResult

export function composeMappers(mappers: Mapper[]): Mapper {
  return (issue) => {
    for (const mapper of mappers) {
      const result = mapper(issue)
      if (!result.matched) continue
      return result
    }

    return { matched: false }
  }
}

export function createCustomMapper<T extends NestJsZodIssue>(
  map: (params: T['params']) => MapperResult
): Mapper {
  return (issue) => {
    if (!isNestJsZodIssue(issue)) return { matched: false }
    const result = map(issue.params)
    if (!result.matched) return { matched: false }
    return result
  }
}

type MinMaxIssue = ZodTooSmallIssue | ZodTooBigIssue

export function createMinMaxMapper<T extends ZodMinMaxValueType>(
  valueType: T,
  map: (issue: MinMaxIssue) => MapperResult
): Mapper {
  return (issue) => {
    if (
      issue.code !== ZodIssueCode.too_small &&
      issue.code !== ZodIssueCode.too_big
    ) {
      return { matched: false }
    }

    if (issue.type !== valueType) {
      return { matched: false }
    }

    const result = map(issue)
    if (!result.matched) return { matched: false }
    return result
  }
}
