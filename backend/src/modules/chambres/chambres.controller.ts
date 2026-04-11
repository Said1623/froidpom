import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChambresService, CreateChambreDto, UpdateChambreDto } from './chambres.service';

@UseGuards(AuthGuard('jwt'))
@Controller('chambres')
export class ChambresController {
  constructor(private readonly service: ChambresService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('stats')
  getStats() { return this.service.getStats(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateChambreDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChambreDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
