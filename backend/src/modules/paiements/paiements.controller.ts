import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaiementsService, CreatePaiementDto } from './paiements.service';

@UseGuards(AuthGuard('jwt'))
@Controller('paiements')
export class PaiementsController {
  constructor(private readonly service: PaiementsService) {}

  @Get()
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId ? parseInt(clientId) : undefined);
  }

  @Get('balance')
  getBalanceGlobale() { return this.service.getBalanceGlobale(); }

  @Get('client/:clientId')
  getBalanceClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.service.getBalanceClient(clientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreatePaiementDto) { return this.service.create(dto); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
