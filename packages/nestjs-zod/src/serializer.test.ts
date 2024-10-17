import { createMock } from '@golevelup/ts-jest'
import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { createZodDto } from './dto'
import { ZodSerializationException } from './exception'
import { ZodSerializerInterceptor } from './serializer'

import { z as actualZod } from 'zod'
import { z as nestjsZod } from '@nest-zod/z'

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('ZodSerializerInterceptor (using %s)', (description, z) => {
  const UserSchema = z.object({
    username: z.string(),
  })

  class UserDto extends createZodDto(UserSchema) {}

  const testUser = {
    username: 'test',
    password: 'test',
  }

  const context = createMock<ExecutionContext>()

  test('interceptor should strip out password', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of(testUser),
    })

    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })

    const interceptor = new ZodSerializerInterceptor(reflector)

    const userObservable = interceptor.intercept(context, handler)
    const user: typeof testUser = await lastValueFrom(userObservable)

    expect(user.password).toBe(undefined)
    expect(user.username).toBe('test')
  })

  test('wrong response shape should throw ZodSerializationException', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of({ user: 'test' }),
    })

    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })

    const interceptor = new ZodSerializerInterceptor(reflector)

    const userObservable = interceptor.intercept(context, handler)
    expect(lastValueFrom(userObservable)).rejects.toBeInstanceOf(
      ZodSerializationException
    )
  })

  test('interceptor should not strip out password if no UserDto is defined', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of(testUser),
    })

    const reflector = createMock<Reflector>({
      getAllAndOverride: jest.fn(),
    })

    const interceptor = new ZodSerializerInterceptor(reflector)

    const userObservable = interceptor.intercept(context, handler)
    const user: typeof testUser = await lastValueFrom(userObservable)

    expect(user.password).toBe('test')
    expect(user.username).toBe('test')
  })
})
