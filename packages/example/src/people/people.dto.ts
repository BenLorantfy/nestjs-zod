import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { stringToDate } from '../codecs';

export class PersonDto extends createZodDto(z.object({
  id: z.number().int().positive().describe('Unique identifier for the person'),
  created: stringToDate,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  height: z.string().describe('Height in centimeters'),
  mass: z.string().describe('Mass in kilograms'),
  hairColor: z.string().describe('Hair color'),
  skinColor: z.string().describe('Skin color'),
  eyeColor: z.string().describe('Eye color'),
  birthYear: z.string().describe('Birth year (e.g., "19BBY")'),
  gender: z.enum(['male', 'female', 'n/a']).describe('Gender of the person'),
  homeworldId: z.string().describe('ID of the person\'s homeworld'),
  filmIds: z.array(z.string()).describe('Array of film IDs'),
  speciesIds: z.array(z.string()).describe('Array of species IDs'),
  vehicleIds: z.array(z.string()).describe('Array of vehicle IDs'),
  starshipIds: z.array(z.string()).describe('Array of starship IDs'),
}).meta({ id: 'Person' }), { codec: true }) {}

export class CreatePersonFormDto extends createZodDto(
  PersonDto.schema.omit({ id: true, created: true }).meta({ id: 'CreatePersonFormDto' })
, {
  codec: true
}) {}

export class PersonListDto extends createZodDto(z.object({
  data: z.array(PersonDto.schema),
}).meta({ id: 'PersonList' }), { codec: true }) {} 

export class GetPersonResponse extends createZodDto(z.object({ data: PersonDto.schema }), { codec: true }) {}

export class PersonFilterDto extends createZodDto(z.object({
  filter: z.object({
    name: z.string().optional().describe('Filter by name'),
  }).optional(),
}), { codec: true }) {}

export class GetPersonParams extends createZodDto(z.object({ id: z.string().transform(val => parseInt(val)) })) {}

export type Person = z.infer<typeof PersonDto.schema>;
export type CreatePersonForm = z.infer<typeof CreatePersonFormDto.schema>;
export type PersonList = z.infer<typeof PersonListDto.schema>;
export type PersonFilter = z.infer<typeof PersonFilterDto.schema>;
