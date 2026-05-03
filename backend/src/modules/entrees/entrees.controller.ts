import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EntreesService } from './entrees.service';

@UseGuards(AuthGuard('jwt'))
@Controller('entrees')
export class EntreesController {
  constructor(private readonly service: EntreesService) {}

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

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}