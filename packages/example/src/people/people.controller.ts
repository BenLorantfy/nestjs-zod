import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CreatePersonDto, PersonDto, PersonListDto, PersonFilterDto, Person, PersonList } from './people.dto';

@ApiTags('People')
@Controller('api/people')
export class PeopleController {
  private mockPeople: Person[] = [
    {
      id: 1,
      name: 'Luke Skywalker',
      height: '172',
      mass: '77',
      hairColor: 'blond',
      skinColor: 'fair',
      eyeColor: 'blue',
      birthYear: '19BBY',
      gender: 'male' as const,
      homeworldId: '1',
      filmIds: ['1', '2', '3', '6'],
      speciesIds: [],
      vehicleIds: ['14', '30'],
      starshipIds: ['12', '22'],
    },
    {
      id: 2,
      name: 'C-3PO',
      height: '167',
      mass: '75',
      hairColor: 'n/a',
      skinColor: 'gold',
      eyeColor: 'yellow',
      birthYear: '112BBY',
      gender: 'n/a' as const,
      homeworldId: '1',
      filmIds: ['1', '2', '3', '4', '5', '6'],
      speciesIds: ['2'],
      vehicleIds: [],
      starshipIds: []
    },
    {
      id: 3,
      name: 'R2-D2',
      height: '96',
      mass: '32',
      hairColor: 'n/a',
      skinColor: 'white, blue',
      eyeColor: 'red',
      birthYear: '33BBY',
      gender: 'n/a' as const,
      homeworldId: '8',
      filmIds: ['1', '2', '3', '4', '5', '6'],
      speciesIds: ['2'],
      vehicleIds: [],
      starshipIds: []
    },
  ];

  @Get()
  @ApiOperation({ summary: 'Get all people' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all people',
    type: PersonListDto 
  })
  @ZodSerializerDto(PersonListDto)
  getPeople(@Query() query: PersonFilterDto): PersonList {
    return {
      data: this.mockPeople.filter(person => query.name ? person.name.includes(query.name) : true),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new person' })
  @ApiResponse({ 
    status: 201, 
    description: 'Person created successfully',
    type: PersonDto 
  })
  @ZodSerializerDto(PersonDto)
  createPerson(@Body() createPersonDto: CreatePersonDto): Person {
    const newPerson = {
      ...createPersonDto,
      id: Math.floor(Math.random() * 1000) + 4
    };

    this.mockPeople.push(newPerson);

    return newPerson;
  }
} 