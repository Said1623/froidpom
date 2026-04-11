import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LocationsService, CreateLocationDto, RetourLocationDto } from './locations.service';

@UseGuards(AuthGuard('jwt'))
@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get()
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId ? parseInt(clientId) : undefined);
  }

  @Get('suivi')
  getSuiviGlobal() { return this.service.getSuiviGlobal(); }

  @Get('suivi/:clientId')
  getSuiviClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.service.getSuiviClient(clientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateLocationDto) { return this.service.create(dto); }

  @Put(':id/retour')
  enregistrerRetour(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RetourLocationDto,
  ) { return this.service.enregistrerRetour(id, dto); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
