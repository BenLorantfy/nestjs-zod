import { Controller, Get, Param } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { z } from 'zod';
import { cleanupOpenApiDoc, createZodDto, ZodResponse } from './index';

const ItemSchema = z
  .object({ id: z.string() })
  .meta({ id: 'Item', title: 'Item' });
class ItemDto extends createZodDto(ItemSchema) {}

@Controller('items')
class ItemsController {
  @Get()
  @ZodResponse({ type: [ItemDto] })
  list(): ItemDto[] {
    return [];
  }

  @Get(':id')
  @ZodResponse({ type: ItemDto })
  get(@Param('id') _id: string): ItemDto {
    return { id: '1' };
  }
}

describe('cleanupOpenApiDoc rewrites all renamed $refs', () => {
  it('rewrites $ref in array-response schema.items to the renamed schema id', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemsController],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const config = new DocumentBuilder()
        .setTitle('t')
        .setVersion('1')
        .build();
      const doc = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

      const schemas = doc.components?.schemas ?? {};

      expect(schemas).toHaveProperty('Item_Output');
      expect(schemas).not.toHaveProperty('ItemDto');
      expect(schemas).not.toHaveProperty('ItemDto_Output');

      const getRef = (doc.paths!['/items/{id}']!.get as any).responses.default
        .content['application/json'].schema.$ref;

      const listItemsRef = (doc.paths!['/items']!.get as any).responses.default
        .content['application/json'].schema.items.$ref;
      expect(getRef).toBe('#/components/schemas/Item_Output');
      expect(listItemsRef).toBe('#/components/schemas/Item_Output');
    } finally {
      await app.close();
    }
  });
});
