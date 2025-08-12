import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Schemas
export const CreateStarshipSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  model: z.string().describe('Starship model'),
  manufacturer: z.string().describe('Manufacturer of the starship'),
  costInCredits: z.string().describe('Cost in credits'),
  length: z.string().describe('Length in meters'),
  maxAtmospheringSpeed: z.string().describe('Maximum atmosphering speed'),
  crew: z.string().describe('Number of crew members'),
  passengers: z.string().describe('Number of passengers'),
  cargoCapacity: z.string().describe('Cargo capacity in kilograms'),
  consumables: z.string().describe('Consumables duration'),
  hyperdriveRating: z.string().describe('Hyperdrive rating'),
  mglt: z.string().describe('MGLT (Megalight per hour)'),
  starshipClass: z.string().describe('Class of the starship'),
  pilotIds: z.array(z.string()).describe('Array of pilot IDs'),
  filmIds: z.array(z.string()).describe('Array of film IDs'),
}).meta({ id: 'CreateStarship' });

export const StarshipSchema = CreateStarshipSchema.extend({
  id: z.number().int().positive().describe('Unique identifier for the starship'),
}).meta({ id: 'Starship' });

export const StarshipListSchema = z.object({
  data: z.array(StarshipSchema),
}).meta({ id: 'StarshipList' });

// DTO classes
export class CreateStarshipDto extends createZodDto(CreateStarshipSchema) {}
export class StarshipDto extends createZodDto(StarshipSchema) {}
export class StarshipListDto extends createZodDto(StarshipListSchema) {}

// Types
export type Starship = z.infer<typeof StarshipSchema>;
export type CreateStarship = z.infer<typeof CreateStarshipSchema>;
export type StarshipList = z.infer<typeof StarshipListSchema>; 