import { Type } from '@nestjs/common'
import { SchemaObjectFactory as SchemaObjectFactoryClass } from '@nestjs/swagger/dist/services/schema-object-factory'
import { isZodDto } from '../dto'
import { zodToOpenAPI } from './zod-to-openapi'

/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable dot-notation */
/* eslint-disable no-param-reassign */

function getSchemaObjectFactory(): Type<SchemaObjectFactoryClass> {
  return require('@nestjs/swagger/dist/services/schema-object-factory')
    .SchemaObjectFactory
}

export function patchNestJsSwagger(
  SchemaObjectFactory = getSchemaObjectFactory()
) {
  if (SchemaObjectFactory.prototype.__patchedWithLoveByNestjsZod) return
  const defaultExplore = SchemaObjectFactory.prototype.exploreModelSchema

  const extendedExplore: SchemaObjectFactoryClass['exploreModelSchema'] =
    function exploreModelSchema(
      this: SchemaObjectFactoryClass | undefined,
      type,
      schemas,
      schemaRefsStack
    ) {
      if (this && this['isLazyTypeFunc'](type)) {
        const factory = type as () => Type<unknown>
        type = factory()
      }

      if (!isZodDto(type)) {
        return defaultExplore.call(this, type, schemas, schemaRefsStack)
      }

      schemas[type.name] = zodToOpenAPI(type.schema)
      return type.name
    }

  SchemaObjectFactory.prototype.exploreModelSchema = extendedExplore
  SchemaObjectFactory.prototype.__patchedWithLoveByNestjsZod = true
}
