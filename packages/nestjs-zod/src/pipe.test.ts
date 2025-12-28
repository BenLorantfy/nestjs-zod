import { ArgumentMetadata, Body, Controller, Post } from '@nestjs/common'
import { IsString } from 'class-validator'
import request from 'supertest'
import { createZodDto } from './dto'
import { ZodValidationException } from './exception'
import { createZodValidationPipe, ZodValidationPipe } from './pipe'
import { setupApp } from './testUtils'

import * as z3 from 'zod/v3'
import * as z4 from 'zod/v4'

describe.each([
  { name: 'v4', z: z4 },
  { name: 'v3', z: z3 as unknown as typeof z4 }
])('$name', ({ z }) => {
  const UserSchema = z.object({
    username: z.string(),
    password: z.string(),
  })
  
  const UserDto = class Dto extends createZodDto(UserSchema) {}
  
  it('should use manually passed Schema / DTO for validation', () => {
    for (const schemaOrDto of [UserSchema, UserDto]) {
      const pipe = new ZodValidationPipe(schemaOrDto)
  
      const valid = {
        username: 'vasya',
        password: '123',
      }
  
      const invalid = {
        username: 'vasya',
        password: 123,
      }
  
      const metadata: ArgumentMetadata = {
        type: 'body',
      }
  
      expect(pipe.transform(valid, metadata)).toEqual(valid)
      expect(() => pipe.transform(invalid, metadata)).toThrowError()
    }
  })
  
  it('should use contextual Dto for validation', () => {
    const pipe = new ZodValidationPipe()
  
    const valid = {
      username: 'vasya',
      password: '123',
    }
  
    const invalid = {
      username: 'vasya',
      password: 123,
    }
  
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: class Dto extends createZodDto(UserSchema) {},
    }
  
    expect(pipe.transform(valid, metadata)).toEqual(valid)
    expect(() => pipe.transform(invalid, metadata)).toThrowError(
      ZodValidationException
    )
  })

  describe('issue#162', () => {
    it('should throw an error if strictSchemaDeclaration is true and using a primitive type', async () => {
      const StrictZodValidationPipe = createZodValidationPipe({
        strictSchemaDeclaration: true,
      })

      @Controller('users')
      class UserController {
        @Post()
        createUser(@Body() body: string) {
          return { received: body }
        }
      }

      const { app } = await setupApp(UserController, {
        pipe: StrictZodValidationPipe,
      })

      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'test' })
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toBe('Internal Server Error')
        })
    });

    it('should throw an error if strictSchemaDeclaration is true and using a class-validator DTO', async () => {
      const StrictZodValidationPipe = createZodValidationPipe({
        strictSchemaDeclaration: true,
      })

      class ClassValidatorUserDto {
        @IsString()
        name!: string
      }

      @Controller('users')
      class UserController {
        @Post()
        createUser(@Body() body: ClassValidatorUserDto) {
          return body
        }
      }

      const { app } = await setupApp(UserController, {
        pipe: StrictZodValidationPipe,
      })

      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'test' })
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toBe('Internal Server Error')
        })
    });

    it('should not throw an error when using a primitive type if strictSchemaDeclaration is not set', async () => {
      @Controller('users')
      class UserController {
        @Post()
        createUser(@Body() body: string) {
          return { received: body }
        }
      }

      const { app } = await setupApp(UserController)

      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'test' })
        .expect(201)
    });

    it('should not throw an error when using a class-validator DTO if strictSchemaDeclaration is not set', async () => {
      class ClassValidatorUserDto {
        @IsString()
        name!: string
      }

      @Controller('users')
      class UserController {
        @Post()
        createUser(@Body() body: ClassValidatorUserDto) {
          return body
        }
      }

      const { app } = await setupApp(UserController)

      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'test' })
        .expect(201)
    });
  })
})
