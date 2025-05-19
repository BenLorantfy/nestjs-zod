import { createMock } from '@golevelup/ts-jest'
import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { createZodDto } from './dto'
import { ZodSerializationException } from './exception'
import { ZodSerializerInterceptor } from './serializer'

import * as z3 from 'zod/v3'
import * as z4 from 'zod/v4'

describe.each([
  { name: 'v4', z: z4 },
  { name: 'v3', z: z3 as unknown as typeof z4 }
])('$name', ({ z }) => {
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
});