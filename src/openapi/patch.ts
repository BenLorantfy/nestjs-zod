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

let done: string[] = []

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
      if (done.includes(type.name)) {
        return type.name
      }

      if (this && this['isLazyTypeFunc'](type)) {
        const factory = type as () => Type<unknown>
        type = factory()
      }

      if (!isZodDto(type)) {
        return defaultExplore(type, schemas, schemaRefsStack)
      }

      schemas[type.name] = zodToOpenAPI(type.schema)
      done = [...done, type.name]
      return type.name
    }

  SchemaObjectFactory.prototype.exploreModelSchema = extendedExplore
  SchemaObjectFactory.prototype.__patchedWithLoveByNestjsZod = true
}
