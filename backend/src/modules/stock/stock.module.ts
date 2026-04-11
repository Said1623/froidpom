import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ChambresModule } from '../chambres/chambres.module';

@Module({
  imports: [TypeOrmModule.forFeature([Entree, Sortie]), ChambresModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
