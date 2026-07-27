import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CreateStarshipFormDto, StarshipDto, StarshipListDto, Starship } from './starships.dto';
import { Response } from 'express';

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
  @ZodResponse({ type: StarshipListDto, description: 'List of all starships' })
  getStarships() {
    return {
      data: this.mockStarships,
    };
  }

  @Post()
  @ZodResponse({ status: 201, type: StarshipDto, description: 'Starship created successfully' })
  createStarship(@Body() createStarshipDto: CreateStarshipFormDto) {
    const newStarship = {
      ...createStarshipDto,
      id: Math.floor(Math.random() * 1000) + 4
    };

    this.mockStarships.push(newStarship);

    return newStarship;
  }

  /**
   * This example shows how to use the @Res decorator to set headers on the
   * response.  Note that in order for `@ZodResponse` to work, we need to return
   * the data from the function and use `passthrough: true`.  We can't use
   * `res.send()`!  `res.send()` bypasses the zod nestjs interceptor 
   * 
   * For more information, search `passthrough` in the zod documentation page
   * for controllers here: https://docs.nestjs.com/controllers
   * 
   * > Nest detects when the handler is using either @Res() or @Next(), indicating
   * > you have chosen the library-specific option. If both approaches are used at
   * > the same time, the Standard approach is automatically disabled for this
   * > single route and will no longer work as expected. To use both approaches at
   * > the same time (for example, by injecting the response object to only set
   * > cookies/headers but still leave the rest to the framework), you must set
   * > the passthrough option to true in the @Res({ passthrough: true })
   * > decorator.
   */
  @Get('headers-example')
  @ZodResponse({ type: StarshipListDto, description: 'List of all starships' })
  getStarships2(@Res({ passthrough: true }) res: Response) {
    res.header('X-Example', 'example');
    return {
      data: this.mockStarships,
    };
  }
} 