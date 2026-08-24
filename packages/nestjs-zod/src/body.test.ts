import { Controller, Post } from '@nestjs/common';
import request from 'supertest';
import { ZodBody } from './body';
import { createZodDto } from './dto';
import { createZodValidationPipe } from './pipe';
import { setupApp, testMany } from './testUtils';

testMany(
  'ZodBody',
  async ({ z }) => {
    let parseCount = 0;
    const CommandSchema = z.union([
      z.object({
        type: z.literal('email'),
        email: z.string().transform((email) => {
          parseCount += 1;
          return email.trim();
        }),
      }),
      z.object({
        type: z.literal('sms'),
        phone: z.string(),
      }),
    ]);

    class CommandDto extends createZodDto(CommandSchema) {}
    type Command = ReturnType<typeof CommandDto.create>;

    @Controller('commands')
    class CommandsController {
      @Post()
      create(@ZodBody(CommandDto) command: Command) {
        if (command.type === 'email') {
          return { recipient: command.email };
        }

        return { recipient: command.phone };
      }
    }

    expect(
      Reflect.getMetadata(
        'design:paramtypes',
        CommandsController.prototype,
        'create',
      ),
    ).toEqual([CommandDto]);

    const StrictZodValidationPipe = createZodValidationPipe({
      strictSchemaDeclaration: true,
    });
    const { app } = await setupApp(CommandsController, {
      pipe: StrictZodValidationPipe,
    });

    await request(app.getHttpServer())
      .post('/commands')
      .send({ type: 'email', email: '  person@example.com  ' })
      .expect(201)
      .expect({ recipient: 'person@example.com' });
    expect(parseCount).toBe(1);

    await request(app.getHttpServer())
      .post('/commands')
      .send({ type: 'email', email: 42 })
      .expect(400);

    await app.close();
  },
  ['3', '4.0.0', 'latest'],
);
