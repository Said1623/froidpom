import { Controller, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StockService } from './stock.service';

@UseGuards(AuthGuard('jwt'))
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('chambres')
  getStockParChambre() { return this.service.getStockParChambre(); }

  @Get('clients')
  getStockParClient() { return this.service.getStockParClient(); }

  @Get('clients/:clientId')
  getMouvementsClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.service.getMouvementsClient(clientId);
  }
}
