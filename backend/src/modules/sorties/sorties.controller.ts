import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SortiesService } from './sorties.service';

@UseGuards(AuthGuard('jwt'))
@Controller('sorties')
export class SortiesController {
  constructor(private readonly service: SortiesService) {}

  @Get()
  findAll(
    @Query('clientId') clientId?: string,
    @Query('chambreId') chambreId?: string,
  ) {
    return this.service.findAll(
      clientId ? parseInt(clientId) : undefined,
      chambreId ? parseInt(chambreId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}