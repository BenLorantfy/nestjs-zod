import { createZodDto } from 'nestjs-zod';
import { zMulterFile } from 'nestjs-zod';
import { z } from 'zod';
import { zFormJson, zFormArray } from '../form-helpers';

const CrewMemberSchema = z.object({
  name: z.string().min(1).describe('Full name of the crew member'),
  role: z
    .enum(['pilot', 'gunner', 'engineer', 'commander'])
    .describe('Role aboard the ship'),
  callsign: z.string().optional().describe('Optional callsign'),
});

const CoordinatesSchema = z.object({
  x: z.coerce.number().describe('X coordinate'),
  y: z.coerce.number().describe('Y coordinate'),
  z: z.coerce.number().optional().describe('Z coordinate (optional)'),
});

const CreateMissionSchema = z
  .object({
    missionName: z.string().min(1).describe('Unique mission identifier'),
    priority: z
      .enum(['critical', 'high', 'normal', 'low'])
      .describe('Mission priority level'),
    maxJumpDistance: z.coerce
      .number()
      .positive()
      .describe('Maximum hyperspace jump distance (parsecs)'),
    coordinates: zFormJson(CoordinatesSchema).describe('Target coordinates'),
    crew: zFormArray(z.array(CrewMemberSchema).min(1)).describe(
      'Assigned crew',
    ),
    objectives: zFormArray(z.array(z.string().min(1)).min(1)).describe(
      'Mission objectives',
    ),
    briefing: zMulterFile()
      .mimeType('application/pdf')
      .maxSize('1Go')
      .optional()
      .describe('Optional mission briefing document'),
  })
  .meta({ id: 'CreateMissionDto' });

export class CreateMissionDto extends createZodDto(CreateMissionSchema) {}
