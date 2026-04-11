import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReservationsService, CreateReservationDto, UpdateReservationDto } from './reservations.service';

@UseGuards(AuthGuard('jwt'))
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId ? parseInt(clientId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateReservationDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
