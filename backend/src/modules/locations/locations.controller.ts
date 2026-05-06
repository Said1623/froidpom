import { Controller, Get, Post, Put, Body, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
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

  @Get('retours')
  findAllRetours(@Query('clientId') clientId?: string) {
    return this.service.findAllRetours(clientId ? parseInt(clientId) : undefined);
  }

  @Get('suivi')
  getSuiviGlobal() {
    return this.service.getSuiviGlobal();
  }

  @Get('suivi/:clientId')
  getSuiviClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.service.getSuiviClient(clientId);
  }

  @Post()
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Post(':id/retour')
  enregistrerRetourPost(@Param('id', ParseIntPipe) id: number, @Body() dto: RetourLocationDto) {
    return this.service.enregistrerRetour(id, dto);
  }

  // Frontend utilise PUT — on supporte les deux méthodes
  @Put(':id/retour')
  enregistrerRetourPut(@Param('id', ParseIntPipe) id: number, @Body() dto: RetourLocationDto) {
    return this.service.enregistrerRetour(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}