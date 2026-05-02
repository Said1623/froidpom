import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { LocationsService, CreateLocationDto, RetourLocationDto } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get()
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId ? parseInt(clientId) : undefined);
  }

  @Get('retours')
  findAllRetours(@Query('clientId') clientId?: string) {
    return this.service.findAllRetours(clientId ? parseInt(clientId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Post(':id/retour')
  enregistrerRetour(@Param('id', ParseIntPipe) id: number, @Body() dto: RetourLocationDto) {
    return this.service.enregistrerRetour(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}