import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodMultipartInterceptor } from 'nestjs-zod';
import { CreateMissionDto } from './missions.dto';

@ApiTags('Missions')
@Controller('api/missions')
export class MissionsController {
  private missions: (CreateMissionDto & { id: number })[] = [
    {
      id: 1,
      missionName: 'Battle of Yavin',
      priority: 'critical',
      maxJumpDistance: 12,
      coordinates: { x: 4462700, y: -2442600, z: 0 },
      crew: [
        { name: 'Luke Skywalker', role: 'pilot', callsign: 'Red Five' },
        { name: 'Wedge Antilles', role: 'pilot', callsign: 'Red Two' },
      ],
      objectives: ['Destroy the Death Star', 'Protect the Rebel base'],
    },
  ];

  @Get()
  findAll() {
    return this.missions;
  }

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Create a mission',
    description: `Accepts \`multipart/form-data\` via bracket notation or JSON strings.

\`\`\`bash
curl -X POST http://localhost:3001/api/missions \\
  -F "missionName=Operation Hoth" \\
  -F "priority=high" \\
  -F "maxJumpDistance=8" \\
  -F "coordinates[x]=123" \\
  -F "coordinates[y]=456" \\
  -F "crew[0][name]=Han Solo" \\
  -F "crew[0][role]=pilot" \\
  -F "crew[0][callsign]=Falcon" \\
  -F "objectives[0]=Evacuate Echo Base" \\
  -F "objectives[1]=Hold off the Imperial assault"
\`\`\``,
  })
  @UseInterceptors(ZodMultipartInterceptor)
  create(@Body() createMissionDto: CreateMissionDto) {
    const mission = { ...createMissionDto, id: this.missions.length + 1 };
    this.missions.push(mission);
    return mission;
  }
}
