import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CreateStarshipDto, StarshipDto, StarshipListDto, Starship, StarshipList } from './starships.dto';

@ApiTags('Starships')
@Controller('api/starships')
export class StarshipsController {
  private mockStarships: Starship[] = [
    {
      id: 1,
      name: 'CR90 corvette',
      model: 'CR90 corvette',
      manufacturer: 'Corellian Engineering Corporation',
      costInCredits: '3500000',
      length: '150',
      maxAtmospheringSpeed: '950',
      crew: '30-165',
      passengers: '600',
      cargoCapacity: '3000000',
      consumables: '1 year',
      hyperdriveRating: '2.0',
      mglt: '60',
      starshipClass: 'corvette',
      pilotIds: [],
      filmIds: ['1', '3', '6'],
    },
    {
      id: 2,
      name: 'Star Destroyer',
      model: 'Imperial I-class Star Destroyer',
      manufacturer: 'Kuat Drive Yards',
      costInCredits: '150000000',
      length: '1,600',
      maxAtmospheringSpeed: '975',
      crew: '47,060',
      passengers: 'n/a',
      cargoCapacity: '36000000',
      consumables: '2 years',
      hyperdriveRating: '2.0',
      mglt: '60',
      starshipClass: 'Star Destroyer',
      pilotIds: [],
      filmIds: ['1', '2', '3'],
    },
    {
      id: 3,
      name: 'Sentinel-class landing craft',
      model: 'Sentinel-class landing craft',
      manufacturer: 'Sienar Fleet Systems, Cyngus Spaceworks',
      costInCredits: '240000',
      length: '38',
      maxAtmospheringSpeed: '1000',
      crew: '5',
      passengers: '75',
      cargoCapacity: '180000',
      consumables: '1 month',
      hyperdriveRating: '1.0',
      mglt: '70',
      starshipClass: 'landing craft',
      pilotIds: [],
      filmIds: ['1'],
    },
  ];

  @Get()
  @ApiOperation({ summary: 'Get all starships' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all starships',
    type: StarshipListDto 
  })
  @ZodSerializerDto(StarshipListDto)
  getStarships(): StarshipList {
    return {
      data: this.mockStarships,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new starship' })
  @ApiResponse({ 
    status: 201, 
    description: 'Starship created successfully',
    type: StarshipDto 
  })
  @ZodSerializerDto(StarshipDto)
  createStarship(@Body() createStarshipDto: CreateStarshipDto): Starship {
    const newStarship = {
      ...createStarshipDto,
      id: Math.floor(Math.random() * 1000) + 4
    };

    this.mockStarships.push(newStarship);

    return newStarship;
  }
} 