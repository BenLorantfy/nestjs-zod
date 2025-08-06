import { ZodIssueBase, ZodIssueCode } from 'zod/v3'

export interface ZodInvalidPasswordNoDigit extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_password_no_digit'
  }
}

export interface ZodInvalidPasswordNoLowercase extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_password_no_lowercase'
  }
}

export interface ZodInvalidPasswordNoUppercase extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_password_no_uppercase'
  }
}

export interface ZodInvalidPasswordNoSpecial extends ZodIssueBase {
  code: typeof ZodIssueCode.custom
  params: {
    isNestJsZod: true
    code: 'invalid_password_no_special'
  }
}

export type ZodAnyPasswordIssue =
  | ZodInvalidPasswordNoDigit
  | ZodInvalidPasswordNoLowercase
  | ZodInvalidPasswordNoUppercase
  | ZodInvalidPasswordNoSpecial
