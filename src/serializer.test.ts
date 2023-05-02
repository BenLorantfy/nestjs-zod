import { createMock } from '@golevelup/ts-jest'
import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { z } from 'zod'
import { createZodDto } from './dto'
import { ZodSerializerInterceptor } from './serializer'

describe('ZodSerializerInterceptor', () => {
  const UserSchema = z.object({
    username: z.string(),
  })

  class UserDto extends createZodDto(UserSchema) {}

  const testUser = {
    username: 'test',
    password: 'test',
  }

  const context = createMock<ExecutionContext>()
  const handler = createMock<CallHandler>({
    handle: () => of(testUser),
  })

  test('interceptor should strip out password', async () => {
    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })

    const interceptor = new ZodSerializerInterceptor(reflector)

    const userObservable = interceptor.intercept(context, handler)
    const user: typeof testUser = await lastValueFrom(userObservable)

    expect(user.password).toBe(undefined)
    expect(user.username).toBe('test')
  })

  test('interceptor should not strip out password if no UserDto is defined', async () => {
    const context = createMock<ExecutionContext>()
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
