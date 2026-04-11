import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService, CreateClientDto, UpdateClientDto } from './clients.service';

@UseGuards(AuthGuard('jwt'))
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  findAll(@Query('search') search?: string) { return this.service.findAll(search); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/stock')
  getStock(@Param('id', ParseIntPipe) id: number) { return this.service.getStockClient(id); }

  @Post()
  create(@Body() dto: CreateClientDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
