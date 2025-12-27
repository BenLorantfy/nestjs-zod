import { Controller, Get, Post, Body, Query, Param, NotFoundException } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CreatePersonFormDto, PersonDto, PersonListDto, PersonFilterDto, Person, GetPersonParams, GetPersonResponse } from './people.dto';

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
      created: new Date('2025-12-11T17:04:50.197Z')
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
      starshipIds: [],
      created: new Date('2025-12-12T17:04:50.197Z')
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
      starshipIds: [],
      created: new Date('2025-12-13T17:04:50.197Z')
    },
  ];

  @Get()
  @ZodResponse({ type: PersonListDto, description: 'List of all people' })
  getPeople(@Query() query: PersonFilterDto) {
    return {
      data: this.mockPeople.filter(person => query.filter?.name ? person.name.includes(query.filter.name) : true),
    };
  }

  @Get(':id')
  @ZodResponse({ type: GetPersonResponse, description: 'List of all people' })
  getPerson(@Param() { id }: GetPersonParams) {
    const person = this.mockPeople.find(person => person.id === id);
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    return {
      data: person,
    };
  }

  @Post()
  @ZodResponse({ type: PersonDto, description: 'Person created successfully' })
  createPerson(@Body() createPersonDto: CreatePersonFormDto) {
    const newPerson = {
      ...createPersonDto,
      id: Math.floor(Math.random() * 1000) + 4,
      created: new Date()
    };

    this.mockPeople.push(newPerson);

    return newPerson;
  }
} 