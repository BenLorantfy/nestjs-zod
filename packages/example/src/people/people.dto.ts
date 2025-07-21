import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Schemas
export const CreatePersonSchema = z.object({
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
}).meta({ id: 'CreatePerson' });

export const PersonSchema = CreatePersonSchema.extend({
  id: z.number().int().positive().describe('Unique identifier for the person'),
}).meta({ id: 'Person' });

export const PersonListSchema = z.object({
  data: z.array(PersonSchema),
}).meta({ id: 'PersonList' });

export const PersonFilterSchema = z.object({
  name: z.string().optional().describe('Filter by name'),
})

// DTO classes
export class CreatePersonDto extends createZodDto(CreatePersonSchema) {}
export class PersonDto extends createZodDto(PersonSchema) {}
export class PersonListDto extends createZodDto(PersonListSchema) {} 
export class PersonFilterDto extends createZodDto(PersonFilterSchema) {}

// Types
export type Person = z.infer<typeof PersonSchema>;
export type CreatePerson = z.infer<typeof CreatePersonSchema>;
export type PersonList = z.infer<typeof PersonListSchema>;
export type PersonFilter = z.infer<typeof PersonFilterSchema>;