import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VentesService } from './ventes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ventes')
@UseGuards(JwtAuthGuard)
export class VentesController {
  constructor(private svc: VentesService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(+id); }
  @Post() create(@Body() dto: any) { return this.svc.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(+id); }
}