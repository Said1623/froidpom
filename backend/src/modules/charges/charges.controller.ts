import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChargesService } from './charges.service';

@UseGuards(AuthGuard('jwt'))
@Controller('charges')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  @Get()
  findAll(@Query('campagne') campagne?: string) {
    return this.service.findAll(campagne);
  }

  @Get('resume')
  getResume(@Query('campagne') campagne?: string) {
    return this.service.getResume(campagne);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/paiements')
  addPaiement(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.addPaiement(id, dto);
  }

  @Delete('paiements/:paiementId')
  removePaiement(@Param('paiementId', ParseIntPipe) paiementId: number) {
    return this.service.removePaiement(paiementId);
  }
}